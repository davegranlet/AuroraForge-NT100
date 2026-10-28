// Decompile a target and its directly called functions to a durable analysis file.
// @category AuroraForge

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.Function;
import java.nio.file.Files;
import java.nio.file.Path;

public class DumpFunctionNeighborhood extends GhidraScript {
    @Override
    public void run() throws Exception {
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        StringBuilder out = new StringBuilder();
        long[] targets = { 0x14001aa30L };
        int count = 0;
        for (long rawTarget : targets) {
            Address target = toAddr(rawTarget);
            Function f = getFunctionAt(target);
            if (f == null) f = getFunctionContaining(target);
            if (f == null) {
                out.append("===== NO FUNCTION @ ").append(target).append(" =====\n\n");
                continue;
            }
            count++;
            out.append("===== ").append(f.getName()).append(" @ ")
               .append(f.getEntryPoint()).append(" =====\n");
            DecompileResults result = decompiler.decompileFunction(f, 180, monitor);
            if (result.decompileCompleted()) out.append(result.getDecompiledFunction().getC());
            else out.append("DECOMPILE FAILED: ").append(result.getErrorMessage());
            out.append("\n\n");
        }
        decompiler.dispose();
        Path output = Path.of("D:/AuroraForge-Aug26/reverse-analysis/bakery-chacha-setup.c");
        Files.writeString(output, out.toString());
        println("Wrote " + count + " functions to " + output);
    }
}
