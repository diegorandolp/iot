"""Lector mínimo de .blend sin comprimir (BLENDER17-01v), guiado por la SDNA del propio archivo. Solo lectura."""
import struct, re

class Blend:
    def __init__(self, path):
        self.b = open(path, 'rb').read()
        assert self.b[:7] == b'BLENDER', 'no es un .blend sin comprimir'
        o = int(self.b[7:9])
        self.blocks = []
        while o < len(self.b):
            code = self.b[o:o+4]
            sdna, = struct.unpack_from('<i', self.b, o+4)
            old, ln, nr = struct.unpack_from('<Qqq', self.b, o+8)
            self.blocks.append(dict(code=code, sdna=sdna, old=old, len=ln, nr=nr, data=o+32))
            if code == b'ENDB': break
            o += 32 + ln
        self.byold = {k['old']: k for k in self.blocks if k['old']}
        self._dna()

    def _dna(self):
        k = next(x for x in self.blocks if x['code'] == b'DNA1')
        b, o = self.b, k['data']
        base = o
        al = lambda x: base + (((x - base) + 3) & ~3)   # alineación relativa al bloque
        assert b[o:o+4] == b'SDNA'; o += 4
        def names(tag):
            nonlocal o
            assert b[o:o+4] == tag, (tag, b[o:o+4]); o += 4
            n, = struct.unpack_from('<i', b, o); o += 4
            out = []
            for _ in range(n):
                e = b.index(0, o); out.append(b[o:e].decode('latin1')); o = e + 1
            o = al(o)
            return out
        self.names = names(b'NAME'); self.types = names(b'TYPE')
        assert b[o:o+4] == b'TLEN'; o += 4
        self.tlen = list(struct.unpack_from(f'<{len(self.types)}H', b, o)); o = al(o + 2*len(self.types))
        assert b[o:o+4] == b'STRC'; o += 4
        n, = struct.unpack_from('<i', b, o); o += 4
        self.structs = []
        for _ in range(n):
            t, nf = struct.unpack_from('<HH', b, o); o += 4
            f = []
            for _ in range(nf):
                ft, fn = struct.unpack_from('<HH', b, o); o += 4
                f.append((self.types[ft], self.names[fn]))
            self.structs.append((self.types[t], f))
        self.sidx = {s[0]: i for i, s in enumerate(self.structs)}

    def fsize(self, typ, name):
        sz = 8 if name.startswith('*') or name.startswith('(*') else self.tlen[self.types.index(typ)]
        for m in re.findall(r'\[(\d+)\]', name): sz *= int(m)
        return sz

    def layout(self, sname):
        o = 0; out = {}
        for typ, name in self.structs[self.sidx[sname]][1]:
            s = self.fsize(typ, name)
            out[re.sub(r'[\*\(\)]', '', name).split('[')[0]] = (o, typ, name, s); o += s
        return out

    def get(self, addr, sname, field):
        off, typ, name, s = self.layout(sname)[field]
        p = addr + off
        if name.startswith('*'): return struct.unpack_from('<Q', self.b, p)[0]
        dims = [int(m) for m in re.findall(r'\[(\d+)\]', name)]
        if typ == 'char' and dims: return self.b[p:p+s].split(b'\0')[0].decode('utf8', 'replace')
        c = {'float': 'f', 'double': 'd', 'int': 'i', 'short': 'h', 'char': 'B', 'int8_t': 'b', 'uchar': 'B', 'ushort': 'H', 'int64_t': 'q'}.get(typ)
        if c is None: return p
        n = 1
        for d in dims: n *= d
        v = struct.unpack_from(f'<{n}{c}', self.b, p)
        return v[0] if not dims else list(v)
