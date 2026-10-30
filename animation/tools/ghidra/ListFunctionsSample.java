// Lists a bounded sample of functions for current-build orientation.
// @category AuroraForge

import ghidra.app.script.GhidraScript;
import ghidra.program.model.listing.Function;
import ghidra.program.model.listing.FunctionIterator;

public class ListFunctionsSample extends GhidraScript {
    @Override
    protected void run() throws Exception {
        int limit = 40;
        if (getScriptArgs().length > 0) limit = Integer.parseInt(getScriptArgs()[0]);
        FunctionIterator it = currentProgram.getFunctionManager().getFunctions(true);
        int i = 0;
        while (it.hasNext() && i < limit) {
            Function f = it.next();
            println("FUNC=" + f.getEntryPoint() + " name=" + f.getName()
                + " size=" + f.getBody().getNumAddresses()
                + " thunk=" + f.isThunk());
            i++;
        }
    }
}
