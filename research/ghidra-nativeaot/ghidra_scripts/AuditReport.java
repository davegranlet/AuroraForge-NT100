// @category Analysis
import ghidra.app.decompiler.*;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.data.StringDataInstance;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;
import java.util.regex.Pattern;

public class AuditReport extends GhidraScript {
    private static final Pattern INTERESTING = Pattern.compile(
        "(?i)(steam|custom.*pck|music\\.pck|ra\\.pck|game_mode|streaming_install|play_(mus|voiceover|sfx)|michael cole|byron saxton|corey graves|greg hamilton|mike rome|samantha irvin|alicia taylor|json|flatbuffer|sound|plugin|cakehook|library-spoof|hook|trampoline|code cave|createfilemapping|mapviewoffile|readprocessmemory|writeprocessmemory|virtualprotect|getprocaddress|loadlibrary)"
    );

    public void run() throws Exception {
        String[] args = getScriptArgs();
        if (args.length != 1) throw new IllegalArgumentException("output path required");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"));
        FunctionManager fm = currentProgram.getFunctionManager();
        int functionCount = fm.getFunctionCount();
        out.println("PROGRAM\t" + currentProgram.getName());
        out.println("FUNCTION_COUNT\t" + functionCount);

        Set<Function> targets = new LinkedHashSet<>();
        Listing listing = currentProgram.getListing();
        DataIterator dit = listing.getDefinedData(true);
        while (dit.hasNext() && !monitor.isCancelled()) {
            Data d = dit.next();
            if (!d.hasStringValue()) continue;
            StringDataInstance sdi = StringDataInstance.getStringDataInstance(d);
            String value = sdi == null ? null : sdi.getStringValue();
            if (value == null || !INTERESTING.matcher(value).find()) continue;
            out.println("STRING\t" + d.getAddress() + "\t" + value.replace("\n", "\\n").replace("\r", "\\r"));
            ReferenceIterator refs = currentProgram.getReferenceManager().getReferencesTo(d.getAddress());
            while (refs.hasNext()) {
                Reference ref = refs.next();
                Function f = fm.getFunctionContaining(ref.getFromAddress());
                if (f != null) {
                    targets.add(f);
                    out.println("STRING_REF\t" + d.getAddress() + "\t" + ref.getFromAddress() + "\t" + f.getName() + "\t" + f.getEntryPoint());
                }
            }
        }

        String[] apiNames = {"ReadProcessMemory", "WriteProcessMemory", "VirtualProtect", "VirtualQueryEx", "CreateFileMappingW", "MapViewOfFile", "GetProcAddress", "LoadLibraryA", "IsDebuggerPresent", "DebugBreak", "_beginthreadex"};
        SymbolTable st = currentProgram.getSymbolTable();
        for (String api : apiNames) {
            SymbolIterator sit = st.getSymbols(api);
            while (sit.hasNext()) {
                Symbol sym = sit.next();
                ReferenceIterator refs = currentProgram.getReferenceManager().getReferencesTo(sym.getAddress());
                while (refs.hasNext()) {
                    Reference ref = refs.next();
                    Function f = fm.getFunctionContaining(ref.getFromAddress());
                    if (f != null) {
                        targets.add(f);
                        out.println("API_REF\t" + api + "\t" + ref.getFromAddress() + "\t" + f.getName() + "\t" + f.getEntryPoint());
                    }
                }
            }
        }

        DecompInterface decomp = new DecompInterface();
        decomp.toggleCCode(true);
        decomp.toggleSyntaxTree(true);
        decomp.openProgram(currentProgram);
        for (Function f : targets) {
            if (monitor.isCancelled()) break;
            out.println("\n===== FUNCTION " + f.getName() + " @ " + f.getEntryPoint() + " =====");
            out.println("SIGNATURE\t" + f.getSignature());
            DecompileResults dr = decomp.decompileFunction(f, 90, monitor);
            if (dr.decompileCompleted()) out.println(dr.getDecompiledFunction().getC());
            else out.println("DECOMPILE_ERROR\t" + dr.getErrorMessage());
        }
        decomp.dispose();
        out.close();
    }
}
