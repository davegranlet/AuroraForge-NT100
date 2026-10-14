// Read-only bounded instruction listing for checking decompiler cast ambiguity.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Instruction;

public class DumpInstructions extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 2) throw new IllegalArgumentException("Usage: <start> <end-exclusive>");
        Address start = toAddr(args[0]);
        Address end = toAddr(args[1]);
        if (end.subtract(start) < 0 || end.subtract(start) > 16384) throw new IllegalArgumentException("Range exceeds 16 KiB");
        Instruction instruction = currentProgram.getListing().getInstructionAt(start);
        while (instruction != null && instruction.getAddress().compareTo(end) < 0) {
            println(instruction.getAddress() + " " + instruction.toString());
            instruction = instruction.getNext();
        }
    }
}
