// Search the Ghidra program memory image for byte patterns and print hit addresses.
// Usage (headless -postScript): SearchMemoryBytes.java <hex|ascii:STRING> [hex2|ascii2:STRING2]
//@category AuroraForge
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.mem.Memory;
import ghidra.program.model.mem.MemoryBlock;
import java.util.ArrayList;
import java.util.List;

public class SearchMemoryBytes extends GhidraScript {
    private int indexOf(byte[] hay, byte[] needle, int from) {
        if (needle.length == 0) return from;
        outer:
        for (int i = Math.max(0, from); i <= hay.length - needle.length; i++) {
            for (int j = 0; j < needle.length; j++) {
                if (hay[i + j] != needle[j]) continue outer;
            }
            return i;
        }
        return -1;
    }

    @Override
    public void run() throws Exception {
        List<byte[]> pats = new ArrayList<byte[]>();
        List<String> labels = new ArrayList<String>();
        String[] args = getScriptArgs();
        for (String arg : args) {
            if (arg.startsWith("ascii:")) { labels.add(arg.substring(6)); pats.add(arg.substring(6).getBytes("US-ASCII")); }
            else {
                String hex = arg.replace(" ", "").toLowerCase();
                if (hex.length() % 2 != 0) { println("odd arg: " + arg); return; }
                byte[] bytes = new byte[hex.length() / 2];
                for (int i = 0; i < bytes.length; i++) bytes[i] = (byte) Integer.parseInt(hex.substring(2 * i, 2 * i + 2), 16);
                labels.add(arg); pats.add(bytes);
            }
        }
        Memory mem = currentProgram.getMemory();
        java.io.PrintStream out = new java.io.PrintStream(new java.io.FileOutputStream("search-hits.log"), true, "UTF-8");
        for (MemoryBlock block : mem.getBlocks()) {
            long size = block.getSize();
            long pos = 0;
            int CHUNK = 1 << 20;
            java.util.TreeSet<Long> seen = new java.util.TreeSet<Long>();
            while (pos < size) {
                int want = (int) Math.min(CHUNK, size - pos);
                Address start = block.getStart().add(pos);
                byte[] read = new byte[want];
                int got = mem.getBytes(start, read);
                if (got <= 0) break;
                for (byte[] pat : pats) {
                    int from = 0;
                    while ((from = indexOf(read, pat, from)) != -1) {
                        Address hit = start.add(from);
                        if (seen.add(hit.getOffset())) {
                            String line = String.format("%s HIT %s %s", block.getName(), hit.toString(), new String(pat, "US-ASCII").replace("\u0000", "\\0"));
                            println(line); out.println(line);
                        }
                        from += 1;
                    }
                }
                pos += Math.max(1, want - (8)); // 8-byte safety overlap for short patterns
            }
        }
        out.println("scan-complete blocks=" + mem.getBlocks().length);
        out.close();
        println("scan complete; see search-hits.log");
    }
}
