// Read-only Ghidra headless script. Dumps fixed-width 64-bit words at a
// specified virtual address; used to inspect metadata pointers without
// changing the analyzed executable or project annotations.

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;

public class DumpMemoryWords extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 2) throw new IllegalArgumentException("Usage: <address> <word-count>");
        Address address = currentProgram.getAddressFactory().getDefaultAddressSpace().getAddress(args[0]);
        int count = Integer.parseInt(args[1]);
        if (count < 1 || count > 64) throw new IllegalArgumentException("word-count must be 1..64");
        for (int i = 0; i < count; i++) {
            Address current = address.add((long) i * 8);
            println(String.format("address=%s qword=%016x", current, currentProgram.getMemory().getLong(current)));
        }
    }
}
