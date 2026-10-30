// Read-only Ghidra headless script. Resolves a vtable's function pointers and
// optionally decompiles selected slots; does not modify the analyzed program.
import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;

public class DumpVtable extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 2 || args.length > 3) {
            throw new IllegalArgumentException("Usage: <vtable-address> <slot-count> [decompile-slots-comma-separated]");
        }
        Address table = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(args[0]);
        int count = Integer.parseInt(args[1]);
        if (count < 1 || count > 128) throw new IllegalArgumentException("slot-count must be 1..128");
        java.util.Set<Integer> decompileSlots = new java.util.HashSet<>();
        if (args.length == 3 && !args[2].isEmpty()) {
            for (String item : args[2].split(",")) decompileSlots.add(Integer.parseInt(item));
        }
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        try {
            for (int i = 0; i < count; i++) {
                Address slotAddress = table.add((long)i * 8);
                long pointer = currentProgram.getMemory().getLong(slotAddress);
                Address target = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(pointer, true);
                Function function = currentProgram.getFunctionManager().getFunctionAt(target);
                println(String.format("slot=%d address=%s target=%s function=%s", i, slotAddress, target,
                    function == null ? "<none>" : function.getName(true)));
                if (decompileSlots.contains(i) && function != null) {
                    DecompileResults result = decompiler.decompileFunction(function, 90, monitor);
                    println("===== slot=" + i + " function=" + function.getName(true) + " completed=" + result.decompileCompleted() + " =====");
                    println(result.getDecompiledFunction() == null ? "<no decompilation>" : result.getDecompiledFunction().getC());
                }
            }
        } finally {
            decompiler.dispose();
        }
    }
}
