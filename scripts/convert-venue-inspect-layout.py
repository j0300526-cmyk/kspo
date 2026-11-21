from pathlib import Path
from lxml import etree as E
from collections import Counter
ROOT=Path(__file__).resolve().parents[1]
p=next((ROOT/'assets-source').rglob('*.dae'))
t=E.parse(str(p),E.XMLParser(resolve_entities=False,no_network=True,load_dtd=False,huge_tree=True))
ns={'c':t.getroot().nsmap[None]}
nodes=t.findall('.//c:node',ns)
for name in ['group_84','group_86','group_976','group_784','group_782','group_46','group_51']:
    matches=[n for n in nodes if n.get('name')==name]
    first=matches[0]
    print(name,len(matches),'ancestors',[(a.get('id'),a.get('name')) for a in reversed(list(first.iterancestors())) if E.QName(a).localname=='node'])
root=t.find('.//c:visual_scene/c:node',ns)
print('root children',[(n.get('id'),n.get('name'),len(n.findall('.//c:node',ns))) for n in root.findall('c:node',ns)])
