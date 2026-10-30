// @category AuroraForge
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;

public class DumpV99HashConstants extends GhidraScript {
    @Override public void run() throws Exception {
        long[] addresses = { 0x140d29680L, 0x140d296a0L, 0x140d296c0L };
        for (long raw : addresses) {
            Address address = toAddr(raw);
            byte[] bytes = new byte[32];
            currentProgram.getMemory().getBytes(address, bytes);
            StringBuilder hex = new StringBuilder();
            for (byte value : bytes) hex.append(String.format("%02x", value & 0xff));
            println(address + " " + hex);
        }
    }
}
