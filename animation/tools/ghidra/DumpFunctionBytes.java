// Read-only helper: dumps the first N bytes at a function entry and its body.
// Usage: DumpFunctionBytes.java <entry-hex> [length=64]
// @category AuroraForge

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;

public class DumpFunctionBytes extends GhidraScript {
    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format("%02x", x & 0xff));
        return s.toString();
    }

    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 1) throw new IllegalArgumentException("Usage: <entry-hex> [length=64]");
        Address entry = toAddr(args[0]);
        int length = args.length > 1 ? Integer.parseInt(args[1]) : 64;
        Function f = getFunctionContaining(entry);
        println("ENTRY=" + entry);
        println("FUNCTION=" + (f == null ? "none" : f.getEntryPoint() + " name=" + f.getName(true)
            + " bodyBytes=" + f.getBody().getNumAddresses()));
        byte[] bytes = new byte[length];
        int got = currentProgram.getMemory().getBytes(entry, bytes);
        println("BYTES_LEN=" + got);
        println("BYTES_HEX=" + hex(bytes));
    }
}
