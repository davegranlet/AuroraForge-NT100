// Aurora read-only Ghidra helper. Search already-decoded instructions in a
// bounded code range for operands that resolve to an exact program address.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.listing.InstructionIterator;
import java.util.ArrayList;
import java.util.List;

public class FindDecodedAddressOperands extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 3) throw new IllegalArgumentException("Usage: <code-start> <code-end-exclusive> <target-address>");
        Address start = toAddr(args[0]);
        Address end = toAddr(args[1]);
        Address target = toAddr(args[2]);
        if (end.compareTo(start) <= 0 || end.subtract(start) > 0x40000000L) {
            throw new IllegalArgumentException("Code range must be non-empty and no larger than 1 GiB");
        }
        List<Function> candidates = new ArrayList<>();
        FunctionIterator iterator = currentProgram.getFunctionManager().getFunctions(start, true);
        while (iterator.hasNext() && !monitor.isCancelled()) {
            Function function = iterator.next();
            if (function.getEntryPoint().compareTo(end) >= 0) break;
            candidates.add(function);
        }
        long functions = 0, instructions = 0, hits = 0;
        for (int i = 0; i < candidates.size() && !monitor.isCancelled(); i++) {
            Function function = candidates.get(i);
            Address entry = function.getEntryPoint();
            Address limit = i + 1 < candidates.size() ? candidates.get(i + 1).getEntryPoint().subtract(1) : end.subtract(1);
            if (limit.subtract(entry) > 0x2000) limit = entry.add(0x2000);
            if (function.getBody().getNumAddresses() <= 1) {
                currentProgram.getFunctionManager().removeFunction(entry);
                currentProgram.getListing().clearCodeUnits(entry, limit, false);
                disassemble(entry);
                function = currentProgram.getFunctionManager().getFunctionAt(entry);
                if (function == null) function = createFunction(entry, null);
            }
            if (function == null) continue;
            functions++;
            InstructionIterator instructionsInFunction = currentProgram.getListing().getInstructions(function.getBody(), true);
            while (instructionsInFunction.hasNext()) {
                Instruction instruction = instructionsInFunction.next();
                instructions++;
                for (int operand = 0; operand < instruction.getNumOperands(); operand++) {
                    for (Object object : instruction.getOpObjects(operand)) {
                        if (object instanceof Address && target.equals(object)) {
                            hits++;
                            println(String.format("target=%s function=%s instruction=%s operand=%d text=%s",
                                target, function.getEntryPoint(), instruction.getAddress(), operand, instruction));
                        }
                    }
                }
            }
        }
        println(String.format("functions=%d instructions=%d addressOperandHits=%d", functions, instructions, hits));
    }
}
