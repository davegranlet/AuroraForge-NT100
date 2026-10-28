// Read-only Ghidra headless script. Reports symbols whose fully qualified name
// contains the requested text, with their addresses and first four 64-bit words.

import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.symbol.Symbol;
import ghidra.program.model.symbol.SymbolIterator;

public class FindSymbols extends GhidraScript {
    @Override
    protected void run() throws Exception {
        String[] terms = getScriptArgs();
        if (terms.length == 0) throw new IllegalArgumentException("Supply one or more symbol-name fragments");
        SymbolIterator symbols = currentProgram.getSymbolTable().getAllSymbols(true);
        while (symbols.hasNext()) {
            Symbol symbol = symbols.next();
            String name = symbol.getName(true);
            for (String term : terms) {
                if (!name.toLowerCase().contains(term.toLowerCase())) continue;
                Address address = symbol.getAddress();
                String words = "";
                try {
                    words = String.format("%016x %016x %016x %016x", currentProgram.getMemory().getLong(address), currentProgram.getMemory().getLong(address.add(8)), currentProgram.getMemory().getLong(address.add(16)), currentProgram.getMemory().getLong(address.add(24)));
                } catch (Exception ignored) {
                    words = "<unreadable>";
                }
                println("name=" + name + " address=" + address + " type=" + symbol.getSymbolType() + " words=" + words);
                break;
            }
        }
    }
}
