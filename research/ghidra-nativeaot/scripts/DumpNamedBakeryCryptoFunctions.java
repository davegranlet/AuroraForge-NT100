// @category AuroraForge

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;

public class DumpNamedBakeryCryptoFunctions extends GhidraScript {
    @Override
    public void run() throws Exception {
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        for (Function function : currentProgram.getFunctionManager().getFunctions(true)) {
            String name = function.getName();
            String lower = name.toLowerCase();
            if (!lower.contains("generatecryptokeyv9_9") &&
                !lower.contains("createinitialkeytablefromnameseed") &&
                !lower.contains("scramblegenseed") &&
                !lower.contains("metrohashunkcustomv9_1")) continue;
            println("===== " + name + " @ " + function.getEntryPoint() + " =====");
            DecompileResults result = decompiler.decompileFunction(function, 120, monitor);
            if (result.decompileCompleted()) println(result.getDecompiledFunction().getC());
            else println("DECOMPILE FAILED: " + result.getErrorMessage());
        }
        decompiler.dispose();
    }
}
