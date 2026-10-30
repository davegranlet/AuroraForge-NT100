// @category Analysis
import ghidra.app.cmd.disassemble.DisassembleCommand;
import ghidra.app.script.GhidraScript;
import ghidra.program.model.address.Address;
import ghidra.program.model.address.AddressSet;
import ghidra.program.model.listing.CodeUnit;
import ghidra.program.model.listing.CodeUnitIterator;
import ghidra.program.model.listing.Listing;
import java.io.FileOutputStream;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;

public class DumpDisassemblyRange extends GhidraScript {
  @Override
  public void run() throws Exception {
    String[] args = getScriptArgs();
    if (args.length < 3) throw new IllegalArgumentException("output path, start VA, end VA required");
    Address start = toAddr(args[1]);
    Address end = toAddr(args[2]);
    new DisassembleCommand(start, null, true).applyTo(currentProgram, monitor);
    Listing listing = currentProgram.getListing();
    try (PrintWriter out = new PrintWriter(new OutputStreamWriter(new FileOutputStream(args[0]), "UTF-8"))) {
      CodeUnitIterator units = listing.getCodeUnits(new AddressSet(start, end), true);
      while (units.hasNext()) {
        CodeUnit unit = units.next();
        out.println(unit.getAddress() + "  " + unit.toString());
      }
    }
  }
}
