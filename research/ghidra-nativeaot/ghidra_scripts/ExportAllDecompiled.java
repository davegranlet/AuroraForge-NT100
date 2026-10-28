// @category Analysis
import ghidra.app.decompiler.*;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;

public class ExportAllDecompiled extends GhidraScript {
    public void run() throws Exception {
        String[] a = getScriptArgs();
        if (a.length != 1) throw new IllegalArgumentException("output path required");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(a[0]), "UTF-8"));
        FunctionManager fm = currentProgram.getFunctionManager();
        DecompInterface di = new DecompInterface();
        di.toggleCCode(true); di.toggleSyntaxTree(true); di.setSimplificationStyle("decompile");
        di.openProgram(currentProgram);
        int total=0, ok=0, failed=0;
        FunctionIterator it=fm.getFunctions(true);
        while(it.hasNext()) {
            Function f=it.next();
            if(f.isExternal() || f.isThunk()) continue;
            total++;
            out.println("\n/* ========================================================================");
            out.println(" * ADDRESS: " + f.getEntryPoint());
            out.println(" * GHIDRA_NAME: " + f.getName());
            out.println(" * SIGNATURE: " + f.getSignature());
            out.println(" * CALLING_FUNCTIONS:");
            ReferenceIterator ri=currentProgram.getReferenceManager().getReferencesTo(f.getEntryPoint());
            Set<String> callers=new TreeSet<>();
            while(ri.hasNext()) { Reference r=ri.next(); Function c=fm.getFunctionContaining(r.getFromAddress()); if(c!=null) callers.add(c.getName()+"@"+c.getEntryPoint()); }
            for(String s:callers) out.println(" *   " + s);
            out.println(" * ====================================================================== */");
            DecompileResults dr=di.decompileFunction(f,120,monitor);
            if(dr.decompileCompleted()) { out.println(dr.getDecompiledFunction().getC()); ok++; }
            else { out.println("/* DECOMPILE_FAILED: " + dr.getErrorMessage() + " */"); failed++; }
            if(total%50==0) { out.flush(); println("Exported "+total+" functions"); }
            if(monitor.isCancelled()) break;
        }
        out.println("\n/* SUMMARY total="+total+" decompiled="+ok+" failed="+failed+" */");
        di.dispose(); out.close();
        println("SUMMARY total="+total+" decompiled="+ok+" failed="+failed);
    }
}
