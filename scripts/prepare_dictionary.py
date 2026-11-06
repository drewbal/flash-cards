"""Usage: python3 scripts/prepare_dictionary.py downloaded.src.tar.xz

Source: https://download.freedict.org/dictionaries/eng-rus/2025.11.23/freedict-eng-rus-2025.11.23.src.tar.xz
Derivative dictionary remains CC BY-SA 3.0. No archive paths are extracted.
"""
import json, re, sys, tarfile, unicodedata
from pathlib import Path
import xml.etree.ElementTree as ET

root_dir = Path(__file__).resolve().parents[1]
ns = {'t': 'http://www.tei-c.org/ns/1.0'}
def clean(s):
    s = re.sub(r'\[\[(?:[^\]|]+\|)?([^\]]+)\]\]', r'\1', s)
    return unicodedata.normalize('NFC', s).replace('\u0301', '').strip()
with tarfile.open(sys.argv[1]) as archive:
    root = ET.fromstring(archive.extractfile('eng-rus/eng-rus.tei').read())
    (root_dir/'public/dictionary-LICENSE.txt').write_bytes(archive.extractfile('eng-rus/COPYING').read())
result=[]
for i,entry in enumerate(root.findall('.//t:entry',ns)):
    word=entry.findtext('t:form/t:orth',namespaces=ns)
    if not word: continue
    for j,sense in enumerate(entry.findall('t:sense',ns)):
        translations=list(dict.fromkeys(clean(q.text or '') for q in sense.findall('t:cit[@type="trans"]/t:quote',ns)))
        translations=[s for s in translations if s]
        if translations:
            result.append({'id':f'{i}-{j}','word':clean(word),'pos':entry.findtext('t:gramGrp/t:pos',default='',namespaces=ns),'translations':translations,'definition':' / '.join(''.join(d.itertext()) for d in sense.findall('.//t:def',ns))})
(root_dir/'public/dictionary.json').write_text(json.dumps(result,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
print(f'{len(result)} senses, {(root_dir/"public/dictionary.json").stat().st_size} bytes')
