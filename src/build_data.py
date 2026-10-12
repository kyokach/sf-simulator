import json,sys,os
HERE=os.path.dirname(os.path.abspath(__file__))
# usage: python3 src/build_data.py path/to/SatisfactoryTools/data/data1.0.json
d=json.load(open(sys.argv[1],encoding='utf-8'))
ja={l.split(': ')[1].strip():l.split(': ')[0] for l in open(os.path.join(HERE,'ja_items.txt'),encoding='utf-8') if ': ' in l}
ja.update({
'BP_ItemDescriptorPortableMiner_C':'ポータブル採掘機','Desc_CrystalShard_C':'パワーシャード',
'Desc_Crystal_C':'ブルー・パワースラッグ','Desc_Crystal_mk2_C':'イエロー・パワースラッグ','Desc_Crystal_mk3_C':'パープル・パワースラッグ',
'Desc_FicsoniumFuelRod_C':'フィクソニウム燃料棒','Desc_Ficsonium_C':'フィクソニウム','Desc_HatcherParts_C':'ハッチャーの残骸',
'Desc_HogParts_C':'ホッグの残骸','Desc_NuclearWaste_C':'ウラン廃棄物','Desc_PlutoniumCell_C':'被覆型プルトニウム・セル',
'Desc_PlutoniumWaste_C':'プルトニウム廃棄物','Desc_SpitterParts_C':'スピッターの残骸','Desc_StingerParts_C':'スティンガーの残骸',
'Desc_SpaceElevatorPart_1_C':'スマート・プレーティング','Desc_SpaceElevatorPart_2_C':'多目的フレームワーク',
'Desc_SpaceElevatorPart_3_C':'自動配線','Desc_SpaceElevatorPart_4_C':'モジュラー・エンジン','Desc_SpaceElevatorPart_5_C':'適応型制御ユニット',
'Desc_SpaceElevatorPart_6_C':'磁場発生器','Desc_SpaceElevatorPart_7_C':'組立管理システム','Desc_SpaceElevatorPart_8_C':'熱推進ロケット',
'Desc_SpaceElevatorPart_9_C':'ニュークリア・パスタ','Desc_SpaceElevatorPart_10_C':'生化学スカルプター','Desc_SpaceElevatorPart_11_C':'弾道ワープドライブ',
'Desc_SpaceElevatorPart_12_C':'AI拡張サーバー'})
mja={'MinerMk1':'採鉱機 Mk.1','MinerMk2':'採鉱機 Mk.2','MinerMk3':'採鉱機 Mk.3','OilPump':'原油抽出機','WaterPump':'揚水ポンプ',
'FrackingSmasher':'資源井加圧機','FrackingExtractor':'地下資源抽出機','SmelterMk1':'製錬炉','FoundryMk1':'鋳造炉','ConstructorMk1':'製作機',
'AssemblerMk1':'組立機','ManufacturerMk1':'製造機','OilRefinery':'精製機','Packager':'充填機','Blender':'混合機','HadronCollider':'粒子加速器',
'QuantumEncoder':'量子エンコーダー','Converter':'変換機','GeneratorBiomass_Automated':'バイオマス・バーナー','GeneratorCoal':'石炭発電機',
'GeneratorFuel':'燃料式発電機','GeneratorGeoThermal':'地熱発電機','GeneratorNuclear':'原子力発電所'}
B=d['buildings']; I=d['items']
# unlocks
unl={}
for s in d['schematics'].values():
    for rc in s['unlock']['recipes']:
        t=s['type']; info=None
        if t=='EST_Milestone': info=['tier',s['tier'],s['name']]
        elif t=='EST_Tutorial': info=['tier',0,s['name']]
        elif t=='EST_MAM': info=['mam',0,s['name']]
        elif t=='EST_Alternate': info=['hdd',0,'Hard Drive']
        elif t=='EST_ResourceSink': info=['shop',0,s['name']]
        if info and (rc not in unl or unl[rc][0]=='shop'): unl[rc]=info
recipes={}; used=set(); machines=set()
for r in d['recipes'].values():
    if not r['inMachine'] or not r['producedIn']: continue
    m=r['producedIn'][0]; machines.add(m)
    bp=B[m]['metadata']['powerConsumption']
    VAR={'Desc_HadronCollider_C','Desc_Converter_C','Desc_QuantumEncoder_C'}
    var=r['isVariablePower'] and m in VAR
    if var: p=(r['minPower']+r['maxPower'])/2
    else: p=bp
    rec={'n':r['name'],'a':int(r['alternate']),'t':r['time'],'m':m,
         'i':[[x['item'],x['amount']] for x in r['ingredients']],
         'o':[[x['item'],x['amount']] for x in r['products']],'p':p}
    if var: rec['pv']=[r['minPower'],r['maxPower']]
    u=unl.get(r['className'])
    if u: rec['u']=u
    recipes[r['className']]=rec
    for x in r['ingredients']+r['products']: used.add(x['item'])
gens={}
for g in d['generators'].values():
    gens[g['className']]={'p':g['powerProduction'],'f':g['fuel'],'w':g['waterToPowerRatio']}
    used.update(g['fuel'])
items={}
for k in sorted(used):
    it=I[k]
    items[k]={'n':it['name'],'j':ja.get(k,it['name']),'l':int(it['liquid']),'s':it['sinkPoints'],'st':it['stackSize'],'e':it['energyValue']}  # descriptions (game flavour text) intentionally omitted
for k in d['resources']: items[k]['r']=1
mach={}
for m in sorted(machines|set(gens)|set(d['miners'])|{'Desc_WaterPump_C','Desc_FrackingSmasher_C','Desc_GeneratorGeoThermal_C'}):
    b=B.get(m)
    if not b: continue
    key=m.replace('Desc_','').replace('_C','')
    mach[m]={'n':b['name'],'j':mja.get(key,b['name']),'p':b['metadata']['powerConsumption']}
miners={k:{'r':v['allowedResources'],'pm':v['itemsPerCycle']/v['extractCycleTime']*60/(1000 if v['allowLiquids'] else 1)} for k,v in d['miners'].items()}
out={'items':items,'recipes':recipes,'machines':mach,'generators':gens,'miners':miners}
s=json.dumps(out,ensure_ascii=False,separators=(',',':'))
open(os.path.join(HERE,'data.json'),'w',encoding='utf-8').write(s)
print(len(items),len(recipes),sum(r['a'] for r in recipes.values()),len(mach),len(s))
print([k for k,v in recipes.items() if 'u' not in v][:40])
