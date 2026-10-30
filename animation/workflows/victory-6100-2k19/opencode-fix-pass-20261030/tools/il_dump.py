import dnfile, dncil
from dncil.cil.body.reader import CilMethodBodyReaderBytes
from dncil.cil.body import CilMethodBody
from dncil.cil.instruction import Instruction
from dncil.clr.token import Token, StringToken

exe = r"D:\WWE2k26-resources\tools\TRIBUTE 26 v1.7.0\TRIBUTE 26\TRIBUTE 26.exe"
data = open(exe, "rb").read()
dn = dnfile.dnPE(exe)
md = dn.net.mdtables

def rva_to_off(rva):
    for s in dn.sections:
        if s.VirtualAddress <= rva < s.VirtualAddress + max(s.Misc_VirtualSize, s.SizeOfRawData):
            return s.PointerToRawData + (rva - s.VirtualAddress)
    return None

names = {}
by_name = {}
for idx, row in enumerate(md.MethodDef.rows):
    n = str(row.Name) if row.Name is not None else ""
    try:
        n = str(row.TypeDef.Name) + "." + n
    except Exception:
        pass
    names[idx + 1] = n
    by_name.setdefault(n, idx + 1)

def resolve(tok):
    if isinstance(tok, StringToken):
        return "str:" + repr(str(tok))
    if isinstance(tok, Token):
        table = tok.table if hasattr(tok, "table") else None
        rid = tok.rid if hasattr(tok, "rid") else None
        if rid is None:
            return str(tok)
        # table is an enum or int
        tv = getattr(table, "value", table)
        if tv == 0x06:
            return "method:" + names.get(rid, "?") + f"[{rid}]"
        if tv == 0x0A:
            try:
                row = md.MemberRef.rows[rid - 1]
                cls = str(row.Class.row.Name) if hasattr(row.Class, "row") and hasattr(row.Class.row, "Name") else str(row.Class)
                return "member:" + cls + "::" + str(row.Name) + f"[{rid}]"
            except Exception:
                return f"member[{rid}]"
        if tv == 0x04:
            try:
                row = md.Field.rows[rid - 1]
                return "field:" + str(row.Name) + f"[{rid}]"
            except Exception:
                return f"field[{rid}]"
        if tv == 0x01:
            try:
                return "typeref:" + str(md.TypeRef.rows[rid - 1].Name) + f"[{rid}]"
            except Exception:
                return f"typeref[{rid}]"
        if tv == 0x02:
            try:
                return "type:" + str(md.TypeDef.rows[rid - 1].Name) + f"[{rid}]"
            except Exception:
                return f"type[{rid}]"
        return f"tok(0x{tv:02x},{rid})"
    return str(tok)

def dump(name_or_rid, max_ins=400):
    if isinstance(name_or_rid, int):
        rid = name_or_rid
    else:
        rid = by_name[name_or_rid]
    row = md.MethodDef.rows[rid - 1]
    rva = row.Rva
    print(f"===== {names.get(rid)} rid={rid} rva=0x{rva:x} flags={row.Flags} impl={row.ImplFlags} =====")
    if not rva:
        print("(no IL body / native)")
        return
    off = rva_to_off(rva)
    body = CilMethodBody(CilMethodBodyReaderBytes(data[off:off + 0x2000]))
    for i, ins in enumerate(body.instructions[:max_ins]):
        try:
            operand = ins.operand
            if operand is None:
                raw_ops = []
            elif isinstance(operand, (list, tuple)):
                raw_ops = list(operand)
            else:
                raw_ops = [operand]
            ops = []
            for op in raw_ops:
                if isinstance(op, (Token, StringToken)):
                    ops.append(resolve(op))
                else:
                    ops.append(repr(op))
            print(f"IL_{ins.offset:04x}: {ins.opcode.name:12s} {' '.join(ops)}")
        except Exception as e:
            print(f"IL_{ins.offset:04x}: {ins.opcode.name:12s} <operr {e}>")

if __name__ == "__main__":
    import sys
    for arg in sys.argv[1:]:
        dump(arg)
