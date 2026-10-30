// Read-only Ghidra headless script. Decompiles every function in the current
// program and writes C-like output to the requested file.
// Args: <output-file> [max-functions]

import ghidra.app.decompiler.DecompInterface;
import ghidra.app.decompiler.DecompileResults;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;
import java.io.BufferedWriter;
import java.io.File;
import java.io.FileWriter;
import java.io.PrintWriter;

public class DecompileAllFunctions extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length < 1) {
            throw new IllegalArgumentException("Usage: DecompileAllFunctions.java <output-file> [max-functions]");
        }
        File output = new File(args[0]);
        int max = args.length > 1 ? Integer.parseInt(args[1]) : 0;
        int total = 0;
        int ok = 0;
        int failed = 0;
        DecompInterface decompiler = new DecompInterface();
        decompiler.openProgram(currentProgram);
        try (PrintWriter writer = new PrintWriter(new BufferedWriter(new FileWriter(output)))) {
            writer.println("# program=" + currentProgram.getName());
            writer.println("# executable=" + currentProgram.getExecutablePath());
            writer.println("# md5=" + currentProgram.getExecutableMD5());
            writer.println("# language=" + currentProgram.getLanguageID());
            FunctionIterator functions = currentProgram.getFunctionManager().getFunctions(true);
            while (functions.hasNext() && (max == 0 || total < max)) {
                Function function = functions.next();
                total++;
                DecompileResults result = decompiler.decompileFunction(function, 120, monitor);
                writer.println("===== function=" + function.getName(true)
                    + " address=" + function.getEntryPoint()
                    + " completed=" + result.decompileCompleted()
                    + " =====");
                if (result.decompileCompleted() && result.getDecompiledFunction() != null) {
                    ok++;
                    writer.println(result.getDecompiledFunction().getC());
                } else {
                    failed++;
                    writer.println("<decompilation failed>");
                    if (result.getErrorMessage() != null) {
                        writer.println("# error=" + result.getErrorMessage());
                    }
                }
            }
            writer.println("# total=" + total + " ok=" + ok + " failed=" + failed);
        } finally {
            decompiler.dispose();
        }
        println("DecompileAllFunctions total=" + total + " ok=" + ok + " failed=" + failed + " output=" + output);
    }
}
