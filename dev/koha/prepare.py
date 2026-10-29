#!/usr/bin/env python3
"""Prepare the demo environment without overwriting an existing configuration."""
import argparse, shutil, subprocess
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--work', type=Path, required=True)
args = parser.parse_args()
work = args.work.resolve()
work.mkdir(parents=True, exist_ok=True)
root = Path(__file__).resolve().parents[2]
source = work / 'koha-src'
if not source.exists():
    subprocess.run(['git','clone','--depth','1','--branch','25.11.x',
                    'https://github.com/Koha-community/Koha.git',str(source)],check=True)
env = Path(__file__).with_name('.env')
if not env.exists():
    shutil.copyfile(env.with_name('.env.example'), env)
    env.chmod(0o600)
subprocess.run(['python3',str(root/'plugin/build.py'),'--stage',str(work/'pmk-plugin'),
                '--output',str(work/'PimpMyKoha-plugin-0.2.0.kpz')],check=True)
print('Environment prepared. Set PMK_KOHA_SOURCE='+str(source))
print('Set PMK_PLUGIN_STAGE='+str(work/'pmk-plugin'))
