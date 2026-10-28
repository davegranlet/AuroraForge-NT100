// Read-only Aurora Ghidra helper for runtime scene-registry vtable classes.
// Resolves each selected vtable and decompiles the shared +0xA0 callback slot.
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;

public class DumpVtables extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 1) throw new IllegalArgumentException("Usage: <vtable-address> [vtable-address ...]");
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        try {
            for (String value : args) {
                Address table = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(value);
                println("===== vtable=" + table + " slotCount=24 =====");
                for (int i = 0; i < 24; i++) {
                    Address slotAddress = table.add((long)i * 8);
                    long pointer = currentProgram.getMemory().getLong(slotAddress);
                    Address target = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(pointer, true);
                    Function function = currentProgram.getFunctionManager().getFunctionAt(target);
                    println(String.format("slot=%d address=%s target=%s function=%s", i, slotAddress, target,
                        function == null ? "<none>" : function.getName(true)));
                    if (i == 20 && function != null) {
                        DecompileResults result = decompiler.decompileFunction(function, 90, monitor);
                        println("===== slot=20 completed=" + result.decompileCompleted() + " =====");
                        println(result.getDecompiledFunction() == null ? "<no decompilation>" : result.getDecompiledFunction().getC());
                    }
                }
            }
        } finally {
            decompiler.dispose();
        }
    }
}