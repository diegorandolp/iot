"""Extrae las mallas en coordenadas de mundo a out/orig.json. No escribe en el .blend."""
import blendread, struct, numpy as np, json, math
B = blendread.Blend('casita_orig.blend'); b = B.b
idoff = B.layout('ID')['name'][0]
idname = lambda a: b[a+idoff:a+idoff+258].split(b'\0')[0].decode('utf8', 'replace')
# Blender 5 reutiliza direcciones entre IDs: cada puntero se resuelve primero dentro del ID actual
scope = {}
def block(ptr): return scope.get(ptr) or B.byold.get(ptr)
def entrar(idblock):
    scope.clear(); i = B.blocks.index(idblock) + 1
    while i < len(B.blocks) and B.blocks[i]['code'] == b'DATA':
        k = B.blocks[i]; scope.setdefault(k['old'], k); i += 1
def cstr(ptr):
    k = block(ptr); return b[k['data']:k['data']+k['len']].split(b'\0')[0].decode() if k else None
def attrs(a):
    st = a + B.layout('Mesh')['attribute_storage'][0]
    ptr, = struct.unpack_from('<Q', b, st); n, = struct.unpack_from('<i', b, st+8); out = {}
    base = block(ptr)['data']
    for i in range(n):
        p = base + 24*i
        nm, = struct.unpack_from('<Q', b, p); dat, = struct.unpack_from('<Q', b, p+16)
        kb = block(dat); d, = struct.unpack_from('<Q', b, kb['data'])
        out[cstr(nm)] = block(d)['data']
    return out
def euler(r):
    x, y, z = r; cx, sx, cy, sy, cz, sz = math.cos(x), math.sin(x), math.cos(y), math.sin(y), math.cos(z), math.sin(z)
    return np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]]).T.T @ np.eye(3) if False else \
        np.array([[cz,-sz,0],[sz,cz,0],[0,0,1]]) @ np.array([[cy,0,sy],[0,1,0],[-sy,0,cy]]) @ np.array([[1,0,0],[0,cx,-sx],[0,sx,cx]])
out = {}
for k in B.blocks:
    if k['code'] != b'OB\0\0': continue
    entrar(k); a = k['data']
    if B.get(a, 'Object', 'type') != 1: continue
    assert not B.get(a, 'Object', 'parent')
    M = euler(B.get(a, 'Object', 'rot')) @ np.diag(B.get(a, 'Object', 'size')); T = np.array(B.get(a, 'Object', 'loc'))
    mk = next(x for x in B.blocks if x['code'] == b'ME\0\0' and x['old'] == B.get(a, 'Object', 'data'))
    entrar(mk); m = mk['data']
    tv, tp, tl = (B.get(m, 'Mesh', f) for f in ('totvert', 'totpoly', 'totloop'))
    at = attrs(m)
    V = np.frombuffer(b, '<f4', tv*3, at['position']).reshape(-1, 3).astype(float) @ M.T + T
    C = np.frombuffer(b, '<i4', tl, at['.corner_vert'])
    O = np.frombuffer(b, '<i4', tp+1, block(B.get(m, 'Mesh', 'poly_offset_indices'))['data'])
    tri = []
    for i in range(tp):
        f = C[O[i]:O[i+1]]
        for j in range(1, len(f)-1): tri += [int(f[0]), int(f[j]), int(f[j+1])]
    n = idname(a)[2:]
    out[n] = dict(v=[round(float(x), 4) for x in V.ravel()], t=tri)
    print(f'{n:22s} v={tv:5d} tris={len(tri)//3:5d} min={np.round(V.min(0),2)} max={np.round(V.max(0),2)}')
json.dump(out, open('orig.json', 'w'))
