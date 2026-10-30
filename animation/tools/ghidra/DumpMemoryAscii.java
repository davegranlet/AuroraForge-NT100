// Aurora read-only Ghidra helper for inspecting native string/dispatch tables.
// Prints exact bytes plus printable ASCII without changing program annotations.
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;

public class DumpMemoryAscii extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 2) {
            throw new IllegalArgumentException("Usage: <start-address-hex> <length-decimal>");
        }
        Address start = toAddr(args[0]);
        int length = Integer.parseInt(args[1]);
        if (length < 1 || length > 4096) {
            throw new IllegalArgumentException("length must be 1..4096 bytes");
        }
        byte[] bytes = new byte[length];
        currentProgram.getMemory().getBytes(start, bytes);
        StringBuilder ascii = new StringBuilder(length);
        StringBuilder hex = new StringBuilder(length * 3);
        for (int i = 0; i < length; i++) {
            int value = bytes[i] & 0xff;
            if (i > 0) hex.append(' ');
            hex.append(String.format("%02x", value));
            ascii.append(value >= 0x20 && value <= 0x7e ? (char)value : '.');
        }
        println("address=" + start + " length=" + length);
        println("hex=" + hex);
        println("ascii=" + ascii);
    }
}
