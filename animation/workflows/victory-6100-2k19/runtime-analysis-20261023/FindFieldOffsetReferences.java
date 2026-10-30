// @category Analysis
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.Instruction;
import ghidra.program.model.listing.InstructionIterator;
import ghidra.program.model.scalar.Scalar;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;

/** Read-only search of the current Ghidra listing for a structure-field displacement. */
public class FindFieldOffsetReferences extends GhidraScript {
    @Override
    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 2) throw new IllegalArgumentException("output path and hex field offset required");
        long wanted = Long.decode(args[1]);
        FunctionManagerView functions = new FunctionManagerView(currentProgram.getFunctionManager());
        try (PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"))) {
            InstructionIterator it = currentProgram.getListing().getInstructions(true);
            long instructionCount = 0;
            long hitCount = 0;
            while (it.hasNext() && !monitor.isCancelled()) {
                Instruction instruction = it.next();
                instructionCount++;
                for (int operand = 0; operand < instruction.getNumOperands(); operand++) {
                    Scalar scalar = instruction.getScalar(operand);
                    String instructionText = instruction.toString();
                    boolean scalarMatch = scalar != null && scalar.getValue() == wanted;
                    boolean displayMatch = instructionText.toLowerCase().contains("0x" + Long.toHexString(wanted));
                    if (!scalarMatch && !displayMatch) continue;
                    Function function = functions.getContaining(instruction.getAddress());
                    out.printf("0x%s\t%s\t%s\toperand=%d\t%s%n",
                        instruction.getAddress().toString(),
                        function == null ? "<no-function>" : function.getEntryPoint().toString(),
                        function == null ? "" : function.getName(),
                        operand,
                        instructionText);
                    hitCount++;
                }
            }
            out.printf("SUMMARY instructions=%d hits=%d offset=0x%x%n", instructionCount, hitCount, wanted);
        }
    }

    private static class FunctionManagerView {
        private final ghidra.program.model.listing.FunctionManager manager;
        FunctionManagerView(ghidra.program.model.listing.FunctionManager manager) { this.manager = manager; }
        Function getContaining(ghidra.program.model.address.Address address) { return manager.getFunctionContaining(address); }
    }
}
