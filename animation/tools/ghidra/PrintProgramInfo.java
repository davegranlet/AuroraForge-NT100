// Prints read-only identity information for the current Ghidra program.
// Used by the animation-targeting investigation to verify that the project
// actually contains the installed WWE2K26 executable build.
// @category AuroraForge

import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Program;
import ghidra.program.model.mem.MemoryBlock;
import java.security.MessageDigest;

public class PrintProgramInfo extends GhidraScript {
    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format("%02x", x & 0xff));
        return s.toString();
    }

    @Override
    protected void run() throws Exception {
        Program p = currentProgram;
        println("PROGRAM_NAME=" + p.getName());
        println("EXECUTABLE_PATH=" + p.getExecutablePath());
        println("EXECUTABLE_FORMAT=" + p.getExecutableFormat());
        println("EXECUTABLE_MD5=" + p.getExecutableMD5());
        println("EXECUTABLE_SHA256=" + p.getExecutableSHA256());
        println("IMAGE_BASE=" + p.getImageBase());
        println("LANGUAGE=" + p.getLanguageID());
        println("FUNCTION_COUNT=" + p.getFunctionManager().getFunctionCount());
        println("MEMORY_BLOCKS=" + p.getMemory().getNumAddressRanges());
        for (MemoryBlock block : p.getMemory().getBlocks()) {
            println("BLOCK=" + block.getName() + " start=" + block.getStart()
                + " end=" + block.getEnd() + " size=" + block.getSize()
                + " initialized=" + block.isInitialized() + " read=" + block.isRead() + " exec=" + block.isExecute());
            if (block.isInitialized() && block.getSize() > 0 && block.getSize() < Integer.MAX_VALUE) {
                try {
                    byte[] bytes = new byte[(int) block.getSize()];
                    block.getBytes(block.getStart(), bytes);
                    MessageDigest md = MessageDigest.getInstance("SHA-256");
                    println("BLOCK_SHA256=" + block.getName() + ":" + hex(md.digest(bytes)));
                } catch (Exception e) {
                    println("BLOCK_SHA256_ERROR=" + block.getName() + ":" + e.getMessage());
                }
            }
        }
    }
}
