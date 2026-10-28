// Aurora Ghidra diagnostic: rebuild symbol-stub functions in a bounded code range,
// then report decoded instructions whose operands contain a requested scalar field offset.
// Run only in a disposable/read-only project; all disassembly changes are in-memory.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.listing.InstructionIterator;
import ghidra.program.model.scalar.Scalar;
import java.util.ArrayList;
import java.util.List;

public class ScanDecodedFieldAccesses extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 3) throw new IllegalArgumentException("Usage: <start-hex> <end-hex-exclusive> <field-offset-hex>");
        Address start = toAddr(args[0]), end = toAddr(args[1]);
        long wanted = Long.parseUnsignedLong(args[2].replaceFirst("^(0x|0X)", ""), 16);
        List<Function> functions = new ArrayList<>();
        FunctionIterator iterator = currentProgram.getFunctionManager().getFunctions(start, true);
        while (iterator.hasNext()) {
            Function f = iterator.next();
            if (f.getEntryPoint().compareTo(end) >= 0) break;
            functions.add(f);
        }
        println("symbolFunctions=" + functions.size());
        long scannedFunctions = 0, matchingInstructions = 0;
        for (int i = 0; i < functions.size() && !monitor.isCancelled(); i++) {
            Function f = functions.get(i);
            Address entry = f.getEntryPoint();
            Address limit = i + 1 < functions.size() ? functions.get(i + 1).getEntryPoint().subtract(1) : end.subtract(1);
            if (limit.subtract(entry) > 0x2000) limit = entry.add(0x2000);
            if (f.getBody().getNumAddresses() <= 1) {
                currentProgram.getFunctionManager().removeFunction(entry);
                currentProgram.getListing().clearCodeUnits(entry, limit, false);
                disassemble(entry);
                f = currentProgram.getFunctionManager().getFunctionAt(entry);
                if (f == null) f = createFunction(entry, null);
            }
            if (f == null) continue;
            scannedFunctions++;
            InstructionIterator instructions = currentProgram.getListing().getInstructions(f.getBody(), true);
            while (instructions.hasNext()) {
                Instruction ins = instructions.next();
                boolean found = false;
                StringBuilder operands = new StringBuilder();
                for (int op = 0; op < ins.getNumOperands(); op++) {
                    for (Object object : ins.getOpObjects(op)) {
                        if (object instanceof Scalar) {
                            Scalar scalar = (Scalar)object;
                            if (scalar.getUnsignedValue() == wanted || scalar.getValue() == wanted) {
                                found = true;
                                if (operands.length() > 0) operands.append(',');
                                operands.append(op);
                            }
                        }
                    }
                }
                if (found) {
                    matchingInstructions++;
                    println(String.format("entry=%s instruction=%s mnemonic=%s operands=%s", entry,
                        ins.getAddress(), ins.getMnemonicString(), operands.toString()));
                    println("  " + ins.toString());
                }
            }
        }
        println("scannedFunctions=" + scannedFunctions + " matchingInstructions=" + matchingInstructions);
    }
}