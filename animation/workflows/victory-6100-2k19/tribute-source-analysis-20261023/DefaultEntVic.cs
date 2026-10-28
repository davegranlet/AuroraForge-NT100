using System;
using System.ComponentModel;
using System.Drawing;
using System.IO;
using System.Runtime.CompilerServices;
using System.Runtime.ExceptionServices;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using msclr.interop;
using std;

namespace TRIBUTE26;

public class DefaultEntVic : Form
{
	private TextBox input_wrestlerID;

	private Label label35;

	private TextBox output_LoadedMoveset;

	private Button btn_JsonEntVic;

	private Label label15;

	private Button btn_CreateSlot;

	private Label label18;

	private Label loggerBox;

	private Container components;

	public DefaultEntVic()
	{
		try
		{
			InitializeComponent();
			return;
		}
		catch
		{
			//try-fault
			base.Dispose(disposing: true);
			throw;
		}
	}

	private void ~DefaultEntVic()
	{
		((IDisposable)components)?.Dispose();
		GC.KeepAlive(this);
	}

	private void InitializeComponent()
	{
		System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(TRIBUTE26.DefaultEntVic));
		this.input_wrestlerID = new System.Windows.Forms.TextBox();
		this.label35 = new System.Windows.Forms.Label();
		this.output_LoadedMoveset = new System.Windows.Forms.TextBox();
		this.btn_JsonEntVic = new System.Windows.Forms.Button();
		this.label15 = new System.Windows.Forms.Label();
		this.btn_CreateSlot = new System.Windows.Forms.Button();
		this.label18 = new System.Windows.Forms.Label();
		this.loggerBox = new System.Windows.Forms.Label();
		base.SuspendLayout();
		System.Windows.Forms.TextBox textBox = this.input_wrestlerID;
		System.Drawing.Font font = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox.Font = font;
		System.Windows.Forms.TextBox textBox2 = this.input_wrestlerID;
		System.Drawing.Point location = new System.Drawing.Point(236, 158);
		textBox2.Location = location;
		this.input_wrestlerID.Name = "input_wrestlerID";
		System.Windows.Forms.TextBox textBox3 = this.input_wrestlerID;
		System.Drawing.Size size = new System.Drawing.Size(139, 29);
		textBox3.Size = size;
		this.input_wrestlerID.TabIndex = 614;
		this.label35.AutoSize = true;
		System.Windows.Forms.Label label = this.label35;
		System.Drawing.Font font2 = new System.Drawing.Font("Rockwell", 12f);
		label.Font = font2;
		System.Windows.Forms.Label label2 = this.label35;
		System.Drawing.Color controlLightLight = System.Drawing.SystemColors.ControlLightLight;
		label2.ForeColor = controlLightLight;
		System.Windows.Forms.Label label3 = this.label35;
		System.Drawing.Point location2 = new System.Drawing.Point(24, 161);
		label3.Location = location2;
		this.label35.Name = "label35";
		System.Windows.Forms.Label label4 = this.label35;
		System.Drawing.Size size2 = new System.Drawing.Size(115, 22);
		label4.Size = size2;
		this.label35.TabIndex = 615;
		this.label35.Text = "Wrestler ID";
		System.Windows.Forms.TextBox textBox4 = this.output_LoadedMoveset;
		System.Drawing.Color controlLight = System.Drawing.SystemColors.ControlLight;
		textBox4.BackColor = controlLight;
		this.output_LoadedMoveset.Enabled = false;
		System.Windows.Forms.TextBox textBox5 = this.output_LoadedMoveset;
		System.Drawing.Font font3 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox5.Font = font3;
		System.Windows.Forms.TextBox textBox6 = this.output_LoadedMoveset;
		System.Drawing.Point location3 = new System.Drawing.Point(28, 269);
		textBox6.Location = location3;
		this.output_LoadedMoveset.Name = "output_LoadedMoveset";
		this.output_LoadedMoveset.ReadOnly = true;
		System.Windows.Forms.TextBox textBox7 = this.output_LoadedMoveset;
		System.Drawing.Size size3 = new System.Drawing.Size(481, 29);
		textBox7.Size = size3;
		this.output_LoadedMoveset.TabIndex = 613;
		System.Windows.Forms.Button button = this.btn_JsonEntVic;
		System.Drawing.Color backColor = System.Drawing.Color.FromArgb(40, 40, 40);
		button.BackColor = backColor;
		this.btn_JsonEntVic.FlatAppearance.BorderSize = 0;
		this.btn_JsonEntVic.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button2 = this.btn_JsonEntVic;
		System.Drawing.Font font4 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button2.Font = font4;
		System.Windows.Forms.Button button3 = this.btn_JsonEntVic;
		System.Drawing.Color control = System.Drawing.SystemColors.Control;
		button3.ForeColor = control;
		System.Windows.Forms.Button button4 = this.btn_JsonEntVic;
		System.Drawing.Point location4 = new System.Drawing.Point(28, 222);
		button4.Location = location4;
		this.btn_JsonEntVic.Name = "btn_JsonEntVic";
		System.Windows.Forms.Button button5 = this.btn_JsonEntVic;
		System.Drawing.Size size4 = new System.Drawing.Size(481, 41);
		button5.Size = size4;
		this.btn_JsonEntVic.TabIndex = 612;
		this.btn_JsonEntVic.Text = "Load EntVic JSON";
		this.btn_JsonEntVic.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button6 = this.btn_JsonEntVic;
		System.EventHandler value = new System.EventHandler(this.btn_JsonEntVic_Click);
		button6.Click += value;
		this.label15.AutoSize = true;
		System.Windows.Forms.Label label5 = this.label15;
		System.Drawing.Font font5 = new System.Drawing.Font("Rockwell", 12f);
		label5.Font = font5;
		System.Windows.Forms.Label label6 = this.label15;
		System.Drawing.Color controlLightLight2 = System.Drawing.SystemColors.ControlLightLight;
		label6.ForeColor = controlLightLight2;
		System.Windows.Forms.Label label7 = this.label15;
		System.Drawing.Point location5 = new System.Drawing.Point(24, 78);
		label7.Location = location5;
		this.label15.Name = "label15";
		System.Windows.Forms.Label label8 = this.label15;
		System.Drawing.Size size5 = new System.Drawing.Size(477, 44);
		label8.Size = size5;
		this.label15.TabIndex = 611;
		this.label15.Text = "Enter the Wrestler ID and load a JSON file\r\nto replace a wrestler's default entrance and victory!";
		System.Windows.Forms.Button button7 = this.btn_CreateSlot;
		System.Drawing.Color backColor2 = System.Drawing.Color.FromArgb(40, 40, 40);
		button7.BackColor = backColor2;
		this.btn_CreateSlot.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button8 = this.btn_CreateSlot;
		System.Drawing.Font font6 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button8.Font = font6;
		System.Windows.Forms.Button button9 = this.btn_CreateSlot;
		System.Drawing.Color control2 = System.Drawing.SystemColors.Control;
		button9.ForeColor = control2;
		System.Windows.Forms.Button button10 = this.btn_CreateSlot;
		System.Drawing.Point location6 = new System.Drawing.Point(28, 354);
		button10.Location = location6;
		this.btn_CreateSlot.Name = "btn_CreateSlot";
		System.Windows.Forms.Button button11 = this.btn_CreateSlot;
		System.Drawing.Size size6 = new System.Drawing.Size(481, 41);
		button11.Size = size6;
		this.btn_CreateSlot.TabIndex = 608;
		this.btn_CreateSlot.Text = "UPDATE ENT/VIC DATA";
		this.btn_CreateSlot.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button12 = this.btn_CreateSlot;
		System.EventHandler value2 = new System.EventHandler(this.btn_CreateSlot_Click);
		button12.Click += value2;
		this.label18.AutoSize = true;
		System.Windows.Forms.Label label9 = this.label18;
		System.Drawing.Font font7 = new System.Drawing.Font("Rockwell Extra Bold", 13.8f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		label9.Font = font7;
		System.Windows.Forms.Label label10 = this.label18;
		System.Drawing.Color steelBlue = System.Drawing.Color.SteelBlue;
		label10.ForeColor = steelBlue;
		System.Windows.Forms.Label label11 = this.label18;
		System.Drawing.Point location7 = new System.Drawing.Point(23, 23);
		label11.Location = location7;
		this.label18.Name = "label18";
		System.Windows.Forms.Label label12 = this.label18;
		System.Drawing.Size size7 = new System.Drawing.Size(369, 27);
		label12.Size = size7;
		this.label18.TabIndex = 609;
		this.label18.Text = "Update Default Templates";
		System.Windows.Forms.Label label13 = this.loggerBox;
		System.Drawing.Color backColor3 = System.Drawing.Color.FromArgb(40, 40, 40);
		label13.BackColor = backColor3;
		this.loggerBox.Dock = System.Windows.Forms.DockStyle.Bottom;
		System.Windows.Forms.Label label14 = this.loggerBox;
		System.Drawing.Font font8 = new System.Drawing.Font("Microsoft Sans Serif", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label14.Font = font8;
		System.Windows.Forms.Label label15 = this.loggerBox;
		System.Drawing.Color control3 = System.Drawing.SystemColors.Control;
		label15.ForeColor = control3;
		System.Windows.Forms.Label label16 = this.loggerBox;
		System.Drawing.Point location8 = new System.Drawing.Point(0, 428);
		label16.Location = location8;
		this.loggerBox.Name = "loggerBox";
		System.Windows.Forms.Label label17 = this.loggerBox;
		System.Windows.Forms.Padding padding = new System.Windows.Forms.Padding(0, 5, 0, 5);
		label17.Padding = padding;
		System.Windows.Forms.Label label18 = this.loggerBox;
		System.Drawing.Size size8 = new System.Drawing.Size(538, 37);
		label18.Size = size8;
		this.loggerBox.TabIndex = 619;
		this.loggerBox.Text = "Default Movesets";
		System.Drawing.SizeF sizeF = new System.Drawing.SizeF(8f, 16f);
		base.AutoScaleDimensions = sizeF;
		base.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
		System.Drawing.Color backColor4 = System.Drawing.Color.FromArgb(20, 20, 20);
		this.BackColor = backColor4;
		System.Drawing.Size clientSize = new System.Drawing.Size(538, 465);
		base.ClientSize = clientSize;
		base.Controls.Add(this.loggerBox);
		base.Controls.Add(this.input_wrestlerID);
		base.Controls.Add(this.label35);
		base.Controls.Add(this.output_LoadedMoveset);
		base.Controls.Add(this.btn_JsonEntVic);
		base.Controls.Add(this.label15);
		base.Controls.Add(this.btn_CreateSlot);
		base.Controls.Add(this.label18);
		base.Icon = (System.Drawing.Icon)resources.GetObject("$this.Icon");
		System.Drawing.Size minimumSize = new System.Drawing.Size(556, 512);
		this.MinimumSize = minimumSize;
		base.Name = "DefaultEntVic";
		base.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
		this.Text = "Update Default Entrance and Victory";
		base.ResumeLayout(false);
		base.PerformLayout();
	}

	private unsafe void btn_JsonEntVic_Click(object sender, EventArgs e)
	{
		marshal_context marshal_context2 = null;
		marshal_context marshal_context3 = new marshal_context();
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj);
		string value;
		try
		{
			marshal_context2 = marshal_context3;
			marshal_context2.marshal_as<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,System::String>(&obj, input_wrestlerID.Text);
			try
			{
				<Module>.atoi(<Module>.std._String_val<std::_Simple_types<char> >._Myptr((_String_val<std::_Simple_types<char> >*)(&obj)));
				OpenFileDialog openFileDialog = new OpenFileDialog();
				value = null;
				openFileDialog.InitialDirectory = "c:\\";
				openFileDialog.Filter = "All files (*.*)|*.*";
				openFileDialog.ValidateNames = false;
				openFileDialog.FilterIndex = 2;
				openFileDialog.RestoreDirectory = true;
				openFileDialog.InitialDirectory = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >((basic_string<char,std::char_traits<char>,std::allocator<char> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?LastDir@Tribute_StaticProperties@@2V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@A));
				if (openFileDialog.ShowDialog() == DialogResult.OK)
				{
					Stream stream = openFileDialog.OpenFile();
					if (stream != null)
					{
						value = openFileDialog.FileName;
						stream.Close();
					}
				}
				if (string.IsNullOrEmpty(value))
				{
					loggerBox.Text = "FAILED To Open JSON File!";
					loggerBox.Refresh();
					GC.KeepAlive(this);
					goto IL_00cc;
				}
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj);
				throw;
			}
			goto end_IL_0009;
			IL_00cc:
			try
			{
				<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj);
				throw;
			}
			goto IL_00ec;
			end_IL_0009:;
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		try
		{
			try
			{
				output_LoadedMoveset.Text = value;
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj);
				throw;
			}
			try
			{
				<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj);
				throw;
			}
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		((IDisposable)marshal_context2).Dispose();
		GC.KeepAlive(this);
		return;
		IL_00ec:
		((IDisposable)marshal_context2).Dispose();
	}

	private unsafe void btn_CreateSlot_Click(object sender, EventArgs e)
	{
		marshal_context marshal_context2 = null;
		marshal_context marshal_context3 = new marshal_context();
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj);
		try
		{
			marshal_context2 = marshal_context3;
			marshal_context2.marshal_as<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,System::String>(&obj, input_wrestlerID.Text);
			try
			{
				if (System.Runtime.CompilerServices.Unsafe.As<basic_string<char,std::char_traits<char>,std::allocator<char> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj, 16)) == 0)
				{
					loggerBox.Text = "ERROR: You must enter a Wrestler ID!";
					loggerBox.Refresh();
					GC.KeepAlive(this);
					goto IL_0061;
				}
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj);
				throw;
			}
			goto end_IL_0009;
			IL_0061:
			try
			{
				<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj);
				throw;
			}
			goto IL_0081;
			end_IL_0009:;
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj2);
		try
		{
			try
			{
				int wrestlerID = <Module>.atoi(<Module>.std._String_val<std::_Simple_types<char> >._Myptr((_String_val<std::_Simple_types<char> >*)(&obj)));
				string text = "";
				if (output_LoadedMoveset.Text != text)
				{
					marshal_context2.marshal_as<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,System::String>(&obj2, output_LoadedMoveset.Text);
					try
					{
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj3);
						basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr = &obj3;
						basic_string<char,std::char_traits<char>,std::allocator<char> >* filename = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj3, &obj2);
						if (<Module>.LoadEntVicFromJSONFileToJSFB(filename, wrestlerID))
						{
							Label label = loggerBox;
							string text2 = new string(<Module>.std._String_val<std::_Simple_types<char> >._Myptr((_String_val<std::_Simple_types<char> >*)(&obj)));
							string text3 = "SUCCESS: Entrance/Victory updated!" + text2;
							label.Text = text3;
							loggerBox.Refresh();
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj4);
							basic_string<char,std::char_traits<char>,std::allocator<char> >* pThis = &obj4;
							basic_string<char,std::char_traits<char>,std::allocator<char> >* bakeName = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj4, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
							basic_string<char,std::char_traits<char>,std::allocator<char> >* folderInTributeToBake;
							try
							{
								System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj5);
								basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr2 = &obj5;
								folderInTributeToBake = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj5, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
							}
							catch
							{
								//try-fault
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), pThis);
								throw;
							}
							<Module>.TellCakeviewToBake(folderInTributeToBake, bakeName);
							input_wrestlerID.Text = "";
							output_LoadedMoveset.Text = "";
							GC.KeepAlive(this);
							goto IL_0199;
						}
					}
					catch
					{
						//try-fault
						<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj2);
						throw;
					}
					goto IL_01ed;
				}
				goto end_IL_008d;
				IL_0199:
				try
				{
					<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj2);
				}
				catch
				{
					//try-fault
					<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj2);
					throw;
				}
				goto IL_01c1;
				end_IL_008d:;
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj);
				throw;
			}
			goto end_IL_008d_2;
			IL_01c1:
			try
			{
				<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj);
				throw;
			}
			goto IL_01e1;
			end_IL_008d_2:;
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		try
		{
			try
			{
				loggerBox.Text = "ERROR: You must load a JSON file!";
				loggerBox.Refresh();
				GC.KeepAlive(this);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj);
				throw;
			}
			try
			{
				<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj);
				throw;
			}
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_01e1:
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_01ed:
		try
		{
			try
			{
				try
				{
					Label label2 = loggerBox;
					string text4 = new string(<Module>.std._String_val<std::_Simple_types<char> >._Myptr((_String_val<std::_Simple_types<char> >*)(&obj)));
					string text5 = "FAILED To Update Entrance/Victory!" + text4;
					label2.Text = text5;
					loggerBox.Refresh();
					input_wrestlerID.Text = "";
					output_LoadedMoveset.Text = "";
					GC.KeepAlive(this);
				}
				catch
				{
					//try-fault
					<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj2);
					throw;
				}
				try
				{
					<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj2);
				}
				catch
				{
					//try-fault
					<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj2);
					throw;
				}
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj);
				throw;
			}
			try
			{
				<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj);
				throw;
			}
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_0081:
		((IDisposable)marshal_context2).Dispose();
	}

	[HandleProcessCorruptedStateExceptions]
	protected override void Dispose([MarshalAs(UnmanagedType.U1)] bool A_0)
	{
		if (A_0)
		{
			try
			{
				~DefaultEntVic();
				return;
			}
			finally
			{
				base.Dispose(disposing: true);
			}
		}
		base.Dispose(disposing: false);
	}
}
