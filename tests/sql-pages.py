"""Check SQL contracts with local SQLite fixtures; MariaDB-only syntax is adapted explicitly.
This does not contact Koha or execute production queries.
"""
from pathlib import Path
import sqlite3,re,json,datetime
root=Path(__file__).resolve().parent.parent
conn=sqlite3.connect(':memory:');conn.row_factory=sqlite3.Row
conn.create_function('CURDATE',0,lambda:'2026-10-17')
conn.create_function('GREATEST',-1,lambda *values:max(x for x in values if x is not None))
conn.create_function('DATEDIFF',2,lambda a,b:(datetime.date.fromisoformat(str(a)[:10])-datetime.date.fromisoformat(str(b)[:10])).days if a and b else None)
conn.create_function('FIND_IN_SET',2,lambda a,b:1 if str(a) in str(b).split(',') else 0)
conn.executescript('''
CREATE TABLE biblio (biblionumber INTEGER PRIMARY KEY,title TEXT,author TEXT,copyrightdate INTEGER,frameworkcode TEXT,timestamp TEXT);
CREATE TABLE biblioitems (biblioitemnumber INTEGER PRIMARY KEY,biblionumber INTEGER,isbn TEXT,issn TEXT);
CREATE TABLE items (itemnumber INTEGER PRIMARY KEY,biblionumber INTEGER,barcode TEXT,homebranch TEXT,holdingbranch TEXT,location TEXT,permanent_location TEXT,ccode TEXT,itype TEXT,datelastseen TEXT,itemlost INTEGER,damaged INTEGER,withdrawn INTEGER,notforloan INTEGER,replacementprice REAL);
CREATE TABLE branchtransfers (branchtransfer_id INTEGER PRIMARY KEY,itemnumber INTEGER,frombranch TEXT,tobranch TEXT,daterequested TEXT,datesent TEXT,datearrived TEXT,datecancelled TEXT,reason TEXT,cancellation_reason TEXT);
CREATE TABLE issues (issue_id INTEGER PRIMARY KEY,itemnumber INTEGER,borrowernumber INTEGER,date_due TEXT);
CREATE TABLE reserves (reserve_id INTEGER PRIMARY KEY,biblionumber INTEGER);
CREATE TABLE subscription (subscriptionid INTEGER PRIMARY KEY,biblionumber INTEGER,branchcode TEXT,startdate TEXT,enddate TEXT,closed INTEGER,graceperiod INTEGER,itemtype TEXT,ccode TEXT);
CREATE TABLE serial (serialid INTEGER PRIMARY KEY,subscriptionid INTEGER,status INTEGER,planneddate TEXT,publisheddate TEXT,claimdate TEXT);
CREATE TABLE deleteditems (itemnumber INTEGER PRIMARY KEY,barcode TEXT,biblionumber INTEGER,biblioitemnumber INTEGER,deleted_on TEXT,notforloan INTEGER,itemlost INTEGER);
CREATE TABLE deletedbiblio (biblionumber INTEGER PRIMARY KEY,title TEXT,author TEXT);
CREATE TABLE deletedbiblioitems (biblioitemnumber INTEGER PRIMARY KEY,isbn TEXT,issn TEXT);
CREATE TABLE borrowers (borrowernumber INTEGER PRIMARY KEY,cardnumber TEXT,surname TEXT,firstname TEXT,branchcode TEXT,phone TEXT,email TEXT,categorycode TEXT);
CREATE TABLE messages (message_id INTEGER PRIMARY KEY,borrowernumber INTEGER,message TEXT,message_date TEXT);
INSERT INTO biblio VALUES (1,'Titre','Auteur',2020,'A','2026-01-01');
INSERT INTO biblioitems VALUES (1,1,'9782070360024','');
INSERT INTO items VALUES (10,1,'CB-10','B1','B2','L','P','C','BOOK','2026-01-01',0,0,0,0,20);
INSERT INTO items VALUES (11,1,'CB-11','B1','B2','L','P','C','BOOK','2026-01-01',0,0,0,0,30);
INSERT INTO branchtransfers VALUES (5,10,'B1','B2','2026-01-01',NULL,NULL,NULL,'Manual',NULL);
INSERT INTO branchtransfers VALUES (6,10,'B1','B2','2026-01-01',NULL,'2026-02-01',NULL,'Manual',NULL);
INSERT INTO branchtransfers VALUES (7,10,'B1','B2','2026-01-01',NULL,NULL,'2026-02-01','Manual','Cancelled');
INSERT INTO issues VALUES (1,10,1,'2026-08-01');
INSERT INTO issues VALUES (2,11,1,'2026-12-01');
INSERT INTO reserves VALUES (1,1),(2,1);
INSERT INTO subscription VALUES (1,1,'B1','2020-01-01','2026-01-01',0,7,'BOOK','C');
INSERT INTO serial VALUES (1,1,1,'2026-01-01','2026-01-01',NULL),(2,1,1,'2026-11-01','2026-11-01',NULL),(3,1,2,'2026-01-01','2026-02-01',NULL),(4,1,7,'2026-01-01','2026-01-01','2026-03-01'),(5,1,41,'2026-01-01','2026-01-01',NULL);
INSERT INTO deleteditems VALUES (20,'DELETED',1,1,'2026-09-20',2,3),(21,'CB-10',1,1,'2026-09-21',0,0);
INSERT INTO borrowers VALUES (1,'CARD','Nom','Prénom','B1','0102030405','mail@example.test','AD');
INSERT INTO messages VALUES (1,1,'Premier contact','2026-01-01'),(2,1,'Deuxième contact','2026-02-01');
''')
def query(name,params):
    source=(root/'sql'/name).read_text()
    assert not re.search(r'^\s*(INSERT|UPDATE|DELETE|DROP|ALTER|CREATE)\b',source,re.M|re.I)
    adapted=re.sub(r'<<[^>]+>>','?',source)
    adapted=adapted.replace('DATE_SUB(CURDATE(), INTERVAL COALESCE(s.graceperiod, 0) DAY)',"date(CURDATE(), '-' || COALESCE(s.graceperiod, 0) || ' days')")
    adapted=re.sub(r'DATE_ADD\(\?, INTERVAL 1 DAY\)',"date(?, '+1 day')",adapted)
    adapted=re.sub(r"GROUP_CONCAT\(DISTINCT NULLIF\(bi\.(isbn|issn), ''\) SEPARATOR ';'\)",r"REPLACE(GROUP_CONCAT(DISTINCT NULLIF(bi.\1, '')), ',', ';')",adapted)
    adapted=adapted.replace("GROUP_CONCAT(m.message ORDER BY m.message_date SEPARATOR ' | ')","GROUP_CONCAT(m.message, ' | ')")
    return [dict(row) for row in conn.execute(adapted,params)]
checks=[]
rows=query('138-transferts.sql',[0]);assert len(rows)==1 and rows[0]['Transfer_ID']==5 and rows[0]['Checkout_Active']==1 and rows[0]['Active_Hold_Count']==2;assert query('138-transferts.sql',[5])==[];checks.append('Transferts : une ligne par transfert actif, comptes non multipliés et pagination')
rows=query('138-periodiques.sql',[0]);r=rows[0];assert r['Serial_Count']==5 and r['Expected_Count']==2 and r['Overdue_Expected_Count']==1 and r['Claimed_Count']==1 and r['Missing_Count']==1;assert r['Last_Arrived']=='2026-02-01';assert query('138-periodiques.sql',[1])==[];checks.append('Périodiques : agrégats et dates du contrat, sans multiplication de fascicules')
rows=query('138-restauration-codes-barres.sql',['DELETED\nCB-10']);assert len(rows)==2;assert rows[0]['conflict']==0 and rows[1]['conflict']==1;checks.append('Restauration codes-barres : liste multiligne et conflit avec un exemplaire existant')
rows=query('138-restauration-dates.sql',['2026-09-20','2026-09-20']);assert len(rows)==1 and rows[0]['itemnumber']==20;checks.append('Restauration dates : bornes inclusives sur la date de suppression')
rows=query('138-signatures-notices.sql',[0]);assert len(rows)==1 and rows[0]['ISBN']=='9782070360024';assert query('138-signatures-notices.sql',[1])==[];checks.append('Signatures : alias bibliographiques et pagination')
rows=query('138-suivi-retards-generique.sql',['B1']);assert len(rows)==1;assert rows[0]['Prêts actifs']==2 and rows[0]['Docs >= 35 j']==1 and rows[0]['Valeur docs >= 35 j']==20;assert rows[0]['Étape']=='À contrôler' and 'Premier contact' in rows[0]['Suivi procédure'];assert query('138-suivi-retards-generique.sql',['OTHER'])==[];assert len(query('138-suivi-retards-generique.sql',['%']))==1;checks.append('Retards génériques : un dossier par lecteur, montant non multiplié, périmètre de site')
report={'passed':checks,'engine':'SQLite fixtures with explicit MariaDB syntax adaptations; not a MariaDB production validation'}
(root/'tests/validation/sql-pages.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
