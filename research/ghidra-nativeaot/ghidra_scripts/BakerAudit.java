// @category Analysis
import ghidra.app.decompiler.*;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.StringDataInstance;
import ghidra.program.model.listing.*;
import ghidra.program.model.scalar.Scalar;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;
import java.util.regex.Pattern;

public class BakerAudit extends GhidraScript {
    private static final Pattern KEYWORDS = Pattern.compile(
        "(?i)(FDIR|_textures\\.tdb|Bake Directory|Baking|Bake failed|Bake complete|cake key|duplicate-hash|No valid file found for hash|compress|obfuscat|T_DB)"
    );

    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 1) throw new IllegalArgumentException("output path required");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"));
        FunctionManager fm = currentProgram.getFunctionManager();
        ReferenceManager refs = currentProgram.getReferenceManager();
        LinkedHashSet<Function> direct = new LinkedHashSet<>();

        DataIterator data = currentProgram.getListing().getDefinedData(true);
        while (data.hasNext() && !monitor.isCancelled()) {
            Data item = data.next();
            if (!item.hasStringValue()) continue;
            StringDataInstance value = StringDataInstance.getStringDataInstance(item);
            String text = value == null ? null : value.getStringValue();
            if (text == null || !KEYWORDS.matcher(text).find()) continue;
            out.println("STRING\t" + item.getAddress() + "\t" + text.replace("\n", "\\n").replace("\r", "\\r"));
            ReferenceIterator it = refs.getReferencesTo(item.getAddress());
            while (it.hasNext()) {
                Reference ref = it.next();
                Function function = fm.getFunctionContaining(ref.getFromAddress());
                if (function != null) {
                    direct.add(function);
                    out.println("STRING_REF\t" + item.getAddress() + "\t" + ref.getFromAddress() + "\t" + function.getEntryPoint());
                }
            }
        }

        InstructionIterator instructions = currentProgram.getListing().getInstructions(true);
        while (instructions.hasNext() && !monitor.isCancelled()) {
            Instruction instruction = instructions.next();
            for (int operand = 0; operand < instruction.getNumOperands(); operand++) {
                for (Object object : instruction.getOpObjects(operand)) {
                    if (!(object instanceof Scalar)) continue;
                    long value = ((Scalar)object).getUnsignedValue();
                    if (value != 0x42445f54L && value != 0x4244545fL && value != 0x52494446L) continue;
                    Function function = fm.getFunctionContaining(instruction.getAddress());
                    if (function != null) {
                        direct.add(function);
                        out.println("MAGIC_REF\t" + Long.toHexString(value) + "\t" + instruction.getAddress() + "\t" + function.getEntryPoint());
                    }
                }
            }
        }

        LinkedHashSet<Function> targets = new LinkedHashSet<>(direct);
        for (Function function : direct) {
            ReferenceIterator callers = refs.getReferencesTo(function.getEntryPoint());
            while (callers.hasNext()) {
                Function caller = fm.getFunctionContaining(callers.next().getFromAddress());
                if (caller != null) targets.add(caller);
            }
            Set<Function> callees = function.getCalledFunctions(monitor);
            targets.addAll(callees);
        }

        out.println("DIRECT_TARGETS\t" + direct.size());
        out.println("ALL_TARGETS\t" + targets.size());
        DecompInterface decompiler = new DecompInterface();
        decompiler.toggleCCode(true);
        decompiler.toggleSyntaxTree(true);
        decompiler.setSimplificationStyle("decompile");
        decompiler.openProgram(currentProgram);
        for (Function function : targets) {
            if (monitor.isCancelled() || function.isExternal()) continue;
            out.println("\n===== " + function.getName() + " @ " + function.getEntryPoint() + " =====");
            out.println("SIGNATURE " + function.getSignature());
            DecompileResults result = decompiler.decompileFunction(function, 180, monitor);
            out.println(result.decompileCompleted() ? result.getDecompiledFunction().getC() : "ERROR " + result.getErrorMessage());
            out.flush();
        }
        decompiler.dispose();
        out.close();
    }
}
