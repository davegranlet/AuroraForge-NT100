// Read-only bounded Ghidra helper to disassemble a small code window around a
// raw constant hit. Run with -readOnly; analysis annotations are discarded.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Instruction;

public class DisassembleWindow extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 3) throw new IllegalArgumentException("Usage: <output-file> <start> <end-exclusive>");
        Address start = toAddr(args[1]);
        Address end = toAddr(args[2]);
        if (end.subtract(start) < 0 || end.subtract(start) > 4096) throw new IllegalArgumentException("Range exceeds 4 KiB");
        disassemble(start);
        Instruction instruction = currentProgram.getListing().getInstructionContaining(start);
        if (instruction == null) instruction = currentProgram.getListing().getInstructionAfter(start);
        try (java.io.PrintWriter out = new java.io.PrintWriter(new java.io.OutputStreamWriter(new java.io.FileOutputStream(args[0]), "UTF-8"))) {
            while (instruction != null && instruction.getAddress().compareTo(end) < 0) {
                out.println(instruction.getAddress() + " " + instruction.toString());
                instruction = instruction.getNext();
            }
        }
    }
}
