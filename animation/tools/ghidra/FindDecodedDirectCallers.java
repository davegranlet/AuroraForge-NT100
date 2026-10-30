// Aurora Forge read-only Ghidra helper. Find decoded direct CALL instructions
// whose flow target matches the requested address inside a bounded code range.
// Run against a disposable/read-only project; rebuilt instructions stay in memory.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.listing.InstructionIterator;
import ghidra.program.model.symbol.FlowType;

public class FindDecodedDirectCallers extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 3) {
            throw new IllegalArgumentException("Usage: <start-hex> <end-hex-exclusive> <target-hex>");
        }
        Address start = toAddr(args[0]);
        Address end = toAddr(args[1]);
        Address target = toAddr(args[2]);
        if (end.compareTo(start) <= 0 || end.subtract(start) > 0x2000000) {
            throw new IllegalArgumentException("Range must be 1..32 MiB");
        }

        long scannedFunctions = 0;
        long decodedCalls = 0;
        long hits = 0;
        FunctionIterator iterator = currentProgram.getFunctionManager().getFunctions(start, true);
        while (iterator.hasNext() && !monitor.isCancelled()) {
            Function function = iterator.next();
            Address entry = function.getEntryPoint();
            if (entry.compareTo(end) >= 0) break;
            Address limit = entry.add(0x2000);
            if (limit.compareTo(end) > 0) limit = end;

            if (function.getBody().getNumAddresses() <= 1) {
                currentProgram.getFunctionManager().removeFunction(entry);
                currentProgram.getListing().clearCodeUnits(entry, limit, false);
                disassemble(entry);
                function = currentProgram.getFunctionManager().getFunctionAt(entry);
                if (function == null) function = createFunction(entry, null);
            }
            if (function == null) continue;
            scannedFunctions++;
            InstructionIterator instructions = currentProgram.getListing().getInstructions(function.getBody(), true);
            while (instructions.hasNext()) {
                Instruction instruction = instructions.next();
                FlowType flow = instruction.getFlowType();
                if (flow == null || !flow.isCall()) continue;
                decodedCalls++;
                for (Address destination : instruction.getFlows()) {
                    if (target.equals(destination)) {
                        hits++;
                        println("caller=" + entry + " callsite=" + instruction.getAddress() +
                            " target=" + destination + " mnemonic=" + instruction);
                    }
                }
            }
        }
        println("range=" + start + ".." + end + " target=" + target +
            " scannedFunctions=" + scannedFunctions + " decodedCalls=" + decodedCalls + " hits=" + hits);
    }
}
