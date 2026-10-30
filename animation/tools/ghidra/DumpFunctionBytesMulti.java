// Read-only Aurora Ghidra helper. Dumps function-entry bytes for many entries
// in one headless run. Usage: <output-file> <entry-hex>[:length] [...]
// Default length is 64 bytes. Writes TSV: entry,functionEntry,bodyBytes,hex
// @category AuroraForge

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;

public class DumpFunctionBytesMulti extends GhidraScript {
    private static String hex(byte[] b, int len) {
        StringBuilder s = new StringBuilder();
        for (int i = 0; i < len; i++) s.append(String.format("%02x", b[i] & 0xff));
        return s.toString();
    }

    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 2) throw new IllegalArgumentException("Usage: <output-file> <entry-hex>[:length] [...]");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"));
        out.println("requested\tfunctionEntry\tname\tbodyBytes\tbytesHex");
        try {
            for (int i = 1; i < args.length; i++) {
                String spec = args[i];
                int length = 64;
                String entryText = spec;
                int colon = spec.indexOf(':');
                if (colon > 0) {
                    entryText = spec.substring(0, colon);
                    length = Integer.parseInt(spec.substring(colon + 1));
                }
                Address entry = toAddr(entryText);
                Function f = getFunctionContaining(entry);
                byte[] bytes = new byte[length];
                int got = currentProgram.getMemory().getBytes(entry, bytes);
                out.println(entryText + "\t"
                    + (f == null ? "none" : f.getEntryPoint().toString()) + "\t"
                    + (f == null ? "none" : f.getName(true)) + "\t"
                    + (f == null ? "0" : Long.toString(f.getBody().getNumAddresses())) + "\t"
                    + hex(bytes, got));
            }
        } finally {
            out.close();
        }
    }
}
