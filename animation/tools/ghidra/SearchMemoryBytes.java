// Search the Ghidra program memory image for byte patterns and print labeled hit addresses.
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

    private String toHex(byte[] bytes) {
        StringBuilder s = new StringBuilder();
        for (byte b : bytes) s.append(String.format("%02x", b & 0xff));
        return s.toString();
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
        int maxPatternLength = 0;
        for (byte[] pat : pats) maxPatternLength = Math.max(maxPatternLength, pat.length);
        for (MemoryBlock block : mem.getBlocks()) {
            long size = block.getSize();
            long pos = 0;
            int CHUNK = 1 << 20;
            java.util.HashSet<String> seen = new java.util.HashSet<String>();
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
                        String key = hit.toString() + ":" + toHex(pat);
                        if (seen.add(key)) {
                            String line = String.format("%s HIT address=%s pattern=%s", block.getName(), hit.toString(), toHex(pat));
                            println(line); out.println(line);
                        }
                        from += 1;
                    }
                }
                pos += Math.max(1, want - Math.max(0, maxPatternLength - 1));
            }
        }
        out.println("scan-complete blocks=" + mem.getBlocks().length);
        out.close();
        println("scan complete; see search-hits.log");
    }
}
