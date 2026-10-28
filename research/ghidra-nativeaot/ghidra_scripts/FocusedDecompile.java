// @category Analysis
import ghidra.app.decompiler.*;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.listing.*;
import ghidra.program.model.symbol.*;
import java.io.*;
import java.util.*;

public class FocusedDecompile extends GhidraScript {
    public void run() throws Exception {
        String[] a = getScriptArgs();
        if (a.length < 2) throw new IllegalArgumentException("output and addresses required");
        PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(a[0]), "UTF-8"));
        FunctionManager fm = currentProgram.getFunctionManager();
        DecompInterface di = new DecompInterface(); di.openProgram(currentProgram);
        for (int i=1; i<a.length; i++) {
            Address addr = toAddr(a[i]);
            Function f = fm.getFunctionAt(addr);
            if (f == null) f = fm.getFunctionContaining(addr);
            if (f == null) { out.println("MISSING " + a[i]); continue; }
            out.println("\n===== " + f.getName() + " @ " + f.getEntryPoint() + " =====");
            out.println("SIGNATURE " + f.getSignature());
            out.println("CALLERS");
            ReferenceIterator ri = currentProgram.getReferenceManager().getReferencesTo(f.getEntryPoint());
            Set<String> seen = new TreeSet<>();
            while (ri.hasNext()) { Reference r=ri.next(); Function c=fm.getFunctionContaining(r.getFromAddress()); if(c!=null) seen.add(c.getName()+" @ "+c.getEntryPoint()+" via "+r.getFromAddress()); }
            for(String s:seen) out.println(s);
            DecompileResults dr=di.decompileFunction(f,120,monitor);
            out.println(dr.decompileCompleted()?dr.getDecompiledFunction().getC():"ERROR "+dr.getErrorMessage());
        }
        di.dispose(); out.close();
    }
}
