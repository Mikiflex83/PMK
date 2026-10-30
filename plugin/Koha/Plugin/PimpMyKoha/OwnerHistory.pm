package Koha::Plugin::PimpMyKoha::OwnerHistory;
use Modern::Perl;
use C4::Context;
use JSON ();

my $PREFIX = 'koha_plugin_pimpmykoha_owner';

sub install {
    my $dbh = C4::Context->dbh;
    $dbh->do(q{CREATE TABLE IF NOT EXISTS koha_plugin_pimpmykoha_owner_state (
      itemnumber INT NOT NULL PRIMARY KEY,
      homebranch VARCHAR(10) NOT NULL,
      initial_homebranch VARCHAR(10) NOT NULL,
      barcode VARCHAR(50) DEFAULT NULL,
      first_seen DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      checked_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4});
    $dbh->do(q{CREATE TABLE IF NOT EXISTS koha_plugin_pimpmykoha_owner_events (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      itemnumber INT NOT NULL,
      barcode VARCHAR(50) DEFAULT NULL,
      old_homebranch VARCHAR(10) DEFAULT NULL,
      new_homebranch VARCHAR(10) DEFAULT NULL,
      event_type VARCHAR(16) NOT NULL,
      source VARCHAR(32) NOT NULL,
      actor_id INT DEFAULT NULL,
      changed_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      KEY item_date (itemnumber, changed_at, id),
      KEY site_date (new_homebranch, changed_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4});
    # Baseline: install-time snapshot, not a historical ownership assertion.
    my ($existing) = $dbh->selectrow_array(q{SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='koha_plugin_pimpmykoha_owner_state' AND COLUMN_NAME='initial_homebranch'});
    unless ($existing) { $dbh->do('ALTER TABLE koha_plugin_pimpmykoha_owner_state ADD COLUMN initial_homebranch VARCHAR(10) DEFAULT NULL AFTER homebranch'); $dbh->do('UPDATE koha_plugin_pimpmykoha_owner_state SET initial_homebranch=homebranch WHERE initial_homebranch IS NULL'); }
    $dbh->do(q{INSERT IGNORE INTO koha_plugin_pimpmykoha_owner_state
      (itemnumber,homebranch,initial_homebranch,barcode)
      SELECT itemnumber,homebranch,homebranch,barcode FROM items WHERE homebranch IS NOT NULL});
    return 1;
}

sub record {
    my ($class, $params) = @_;
    my $action = $params->{action} // '';
    my $item = $params->{payload}{item} // $params->{item};
    return unless $item;
    my $id = $item->itemnumber;
    return unless defined $id && $id =~ /^\d+$/;
    my $dbh = C4::Context->dbh;
    my $actor = C4::Context->userenv ? C4::Context->userenv->{number} : undef;
    my $owner = $action eq 'delete' ? undef : $item->homebranch;
    my $barcode = $item->barcode;
    my $transaction = 0;
    eval {
        $dbh->begin_work; $transaction = 1;
        my $state = $dbh->selectrow_hashref(
          'SELECT homebranch,barcode FROM koha_plugin_pimpmykoha_owner_state WHERE itemnumber=? FOR UPDATE',
          undef,$id);
        if (!$state) {
            if (defined $owner) {
                $dbh->do(q{INSERT INTO koha_plugin_pimpmykoha_owner_state
                    (itemnumber,homebranch,initial_homebranch,barcode) VALUES (?,?,?,?)},
                    undef,$id,$owner,$owner,$barcode);
                # Explicit first known state; never fabricate the original owner.
                $dbh->do(q{INSERT INTO koha_plugin_pimpmykoha_owner_events
                    (itemnumber,barcode,new_homebranch,event_type,source,actor_id)
                    VALUES (?,?,?,'baseline','hook',?)},undef,$id,$barcode,$owner,$actor);
            }
        } elsif ($action eq 'delete') {
            $dbh->do(q{INSERT INTO koha_plugin_pimpmykoha_owner_events
                (itemnumber,barcode,old_homebranch,event_type,source,actor_id)
                VALUES (?,?,?,'deleted','hook',?)},
                undef,$id,$barcode // $state->{barcode},$state->{homebranch},$actor);
            $dbh->do('DELETE FROM koha_plugin_pimpmykoha_owner_state WHERE itemnumber=?',undef,$id);
        } elsif (defined($owner) && $state->{homebranch} ne $owner) {
            $dbh->do(q{INSERT INTO koha_plugin_pimpmykoha_owner_events
                (itemnumber,barcode,old_homebranch,new_homebranch,event_type,source,actor_id)
                VALUES (?,?,?,?,'change','hook',?)},
                undef,$id,$barcode,$state->{homebranch},$owner,$actor);
            $dbh->do(q{UPDATE koha_plugin_pimpmykoha_owner_state
                SET homebranch=?,barcode=?,checked_at=NOW() WHERE itemnumber=?},
                undef,$owner,$barcode,$id);
        } else {
            $dbh->do(q{UPDATE koha_plugin_pimpmykoha_owner_state
              SET barcode=?,checked_at=NOW() WHERE itemnumber=?},undef,$barcode,$id);
        }
        $dbh->commit; $transaction=0;
        1;
    } or do {
        my $error=$@;
        eval { $dbh->rollback if $transaction };
        warn "PMK owner history: $error";
    };
}

sub get {
    my ($class,$c)=@_;
    $c = $c->openapi->valid_input or return;
    my $patron = $c->stash('koha.user');
    return $c->render(status=>403,openapi=>{error=>'staff_required'}) unless $patron;
    my $id = $c->validation->param('item_id');
    return $c->render(status=>400,openapi=>{error=>'invalid_item_id'})
       unless defined $id && $id =~ /^[1-9]\d*$/;
    my $dbh = C4::Context->dbh;
    my $events = $dbh->selectall_arrayref(q{SELECT id,itemnumber,barcode,old_homebranch,new_homebranch,
      event_type,source,actor_id,DATE_FORMAT(changed_at,'%Y-%m-%dT%H:%i:%s.%f') AS changed_at
      FROM koha_plugin_pimpmykoha_owner_events WHERE itemnumber=?
      ORDER BY changed_at ASC,id ASC LIMIT 2000},{Slice=>{}},$id);
    my $state = $dbh->selectrow_hashref(q{SELECT itemnumber,homebranch,initial_homebranch,barcode,
      DATE_FORMAT(first_seen,'%Y-%m-%dT%H:%i:%s') AS first_seen
      FROM koha_plugin_pimpmykoha_owner_state WHERE itemnumber=?},undef,$id);
    $c->res->headers->cache_control('private, no-store');
    return $c->render(status=>200,openapi=>{state=>$state,events=>$events,
      partial=> scalar(@$events)==2000 ? JSON::true : JSON::false,
      coverage=>'hook_only_no_direct_sql_guarantee'});
}
1;
