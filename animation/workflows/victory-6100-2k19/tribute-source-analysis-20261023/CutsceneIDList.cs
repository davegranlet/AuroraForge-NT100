using System;
using System.ComponentModel;
using System.Drawing;
using System.Runtime.CompilerServices;
using System.Runtime.ExceptionServices;
using System.Runtime.InteropServices;
using System.Windows.Forms;
using msclr.interop;
using std;

namespace TRIBUTE26;

public class CutsceneIDList : Form
{
	private Label label4;

	private TextBox input_searchBox;

	private Label label18;

	private Button btn_LoadIDList;

	private ListBox list_charMaps;

	private Label loggerBox;

	private Button btn_SDB;

	private Button btn_SaveAsNew;

	private Label label3;

	private Label label1;

	private TextBox input_NameSDBID;

	private Button btn_SaveChanges;

	private Label label10;

	private TextBox input_cutsceneID;

	private Button btn_removeSelected;

	private Button btn_EditSelected;

	private ComboBox cbType;

	private Label label2;

	private TextBox input_numCharacters;

	private Label label5;

	private TextBox input_defaultChar1;

	private Label label6;

	private TextBox input_defaultChar2;

	private Label label7;

	private TextBox input_defaultChar3;

	private Label label8;

	private TextBox input_defaultChar4;

	private Label label9;

	private TextBox input_defaultChar5;

	private Container components;

	public CutsceneIDList()
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

	private void ~CutsceneIDList()
	{
		((IDisposable)components)?.Dispose();
		GC.KeepAlive(this);
	}

	private void InitializeComponent()
	{
		System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(TRIBUTE26.CutsceneIDList));
		this.label4 = new System.Windows.Forms.Label();
		this.input_searchBox = new System.Windows.Forms.TextBox();
		this.label18 = new System.Windows.Forms.Label();
		this.btn_LoadIDList = new System.Windows.Forms.Button();
		this.list_charMaps = new System.Windows.Forms.ListBox();
		this.loggerBox = new System.Windows.Forms.Label();
		this.btn_SDB = new System.Windows.Forms.Button();
		this.btn_SaveAsNew = new System.Windows.Forms.Button();
		this.label3 = new System.Windows.Forms.Label();
		this.label1 = new System.Windows.Forms.Label();
		this.input_NameSDBID = new System.Windows.Forms.TextBox();
		this.btn_SaveChanges = new System.Windows.Forms.Button();
		this.label10 = new System.Windows.Forms.Label();
		this.input_cutsceneID = new System.Windows.Forms.TextBox();
		this.btn_removeSelected = new System.Windows.Forms.Button();
		this.btn_EditSelected = new System.Windows.Forms.Button();
		this.cbType = new System.Windows.Forms.ComboBox();
		this.label2 = new System.Windows.Forms.Label();
		this.input_numCharacters = new System.Windows.Forms.TextBox();
		this.label5 = new System.Windows.Forms.Label();
		this.input_defaultChar1 = new System.Windows.Forms.TextBox();
		this.label6 = new System.Windows.Forms.Label();
		this.input_defaultChar2 = new System.Windows.Forms.TextBox();
		this.label7 = new System.Windows.Forms.Label();
		this.input_defaultChar3 = new System.Windows.Forms.TextBox();
		this.label8 = new System.Windows.Forms.Label();
		this.input_defaultChar4 = new System.Windows.Forms.TextBox();
		this.label9 = new System.Windows.Forms.Label();
		this.input_defaultChar5 = new System.Windows.Forms.TextBox();
		base.SuspendLayout();
		this.label4.AutoSize = true;
		System.Windows.Forms.Label label = this.label4;
		System.Drawing.Font font = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label.Font = font;
		System.Windows.Forms.Label label2 = this.label4;
		System.Drawing.Color controlLightLight = System.Drawing.SystemColors.ControlLightLight;
		label2.ForeColor = controlLightLight;
		System.Windows.Forms.Label label3 = this.label4;
		System.Drawing.Point location = new System.Drawing.Point(13, 120);
		label3.Location = location;
		this.label4.Name = "label4";
		System.Windows.Forms.Label label4 = this.label4;
		System.Drawing.Size size = new System.Drawing.Size(78, 22);
		label4.Size = size;
		this.label4.TabIndex = 459;
		this.label4.Text = "Search:";
		System.Windows.Forms.TextBox textBox = this.input_searchBox;
		System.Drawing.Font font2 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox.Font = font2;
		System.Windows.Forms.TextBox textBox2 = this.input_searchBox;
		System.Drawing.Point location2 = new System.Drawing.Point(107, 117);
		textBox2.Location = location2;
		this.input_searchBox.Name = "input_searchBox";
		System.Windows.Forms.TextBox textBox3 = this.input_searchBox;
		System.Drawing.Size size2 = new System.Drawing.Size(423, 29);
		textBox3.Size = size2;
		this.input_searchBox.TabIndex = 458;
		System.Windows.Forms.TextBox textBox4 = this.input_searchBox;
		System.EventHandler value = new System.EventHandler(this.input_searchBox_TextChanged);
		textBox4.TextChanged += value;
		this.label18.AutoSize = true;
		System.Windows.Forms.Label label5 = this.label18;
		System.Drawing.Font font3 = new System.Drawing.Font("Rockwell Extra Bold", 13.8f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		label5.Font = font3;
		System.Windows.Forms.Label label6 = this.label18;
		System.Drawing.Color steelBlue = System.Drawing.Color.SteelBlue;
		label6.ForeColor = steelBlue;
		System.Windows.Forms.Label label7 = this.label18;
		System.Drawing.Point location3 = new System.Drawing.Point(12, 9);
		label7.Location = location3;
		this.label18.Name = "label18";
		System.Windows.Forms.Label label8 = this.label18;
		System.Drawing.Size size3 = new System.Drawing.Size(411, 27);
		label8.Size = size3;
		this.label18.TabIndex = 457;
		this.label18.Text = "Entrance/Victory Anim ID List";
		System.Windows.Forms.Button button = this.btn_LoadIDList;
		System.Drawing.Color backColor = System.Drawing.Color.FromArgb(40, 40, 40);
		button.BackColor = backColor;
		this.btn_LoadIDList.FlatAppearance.BorderSize = 0;
		this.btn_LoadIDList.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button2 = this.btn_LoadIDList;
		System.Drawing.Font font4 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button2.Font = font4;
		System.Windows.Forms.Button button3 = this.btn_LoadIDList;
		System.Drawing.Color control = System.Drawing.SystemColors.Control;
		button3.ForeColor = control;
		System.Windows.Forms.Button button4 = this.btn_LoadIDList;
		System.Drawing.Point location4 = new System.Drawing.Point(17, 62);
		button4.Location = location4;
		this.btn_LoadIDList.Name = "btn_LoadIDList";
		System.Windows.Forms.Button button5 = this.btn_LoadIDList;
		System.Drawing.Size size4 = new System.Drawing.Size(514, 39);
		button5.Size = size4;
		this.btn_LoadIDList.TabIndex = 456;
		this.btn_LoadIDList.Text = "LOAD ID LIST";
		this.btn_LoadIDList.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button6 = this.btn_LoadIDList;
		System.EventHandler value2 = new System.EventHandler(this.btn_LoadIDList_Click);
		button6.Click += value2;
		System.Windows.Forms.ListBox listBox = this.list_charMaps;
		System.Drawing.Color backColor2 = System.Drawing.Color.FromArgb(60, 60, 60);
		listBox.BackColor = backColor2;
		System.Windows.Forms.ListBox listBox2 = this.list_charMaps;
		System.Drawing.Font font5 = new System.Drawing.Font("Rockwell", 10.8f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		listBox2.Font = font5;
		System.Windows.Forms.ListBox listBox3 = this.list_charMaps;
		System.Drawing.Color control2 = System.Drawing.SystemColors.Control;
		listBox3.ForeColor = control2;
		this.list_charMaps.FormattingEnabled = true;
		this.list_charMaps.ItemHeight = 20;
		System.Windows.Forms.ListBox listBox4 = this.list_charMaps;
		System.Drawing.Point location5 = new System.Drawing.Point(16, 152);
		listBox4.Location = location5;
		this.list_charMaps.Name = "list_charMaps";
		this.list_charMaps.ScrollAlwaysVisible = true;
		System.Windows.Forms.ListBox listBox5 = this.list_charMaps;
		System.Drawing.Size size5 = new System.Drawing.Size(515, 524);
		listBox5.Size = size5;
		this.list_charMaps.TabIndex = 455;
		System.Windows.Forms.Label label9 = this.loggerBox;
		System.Drawing.Color backColor3 = System.Drawing.Color.FromArgb(40, 40, 40);
		label9.BackColor = backColor3;
		this.loggerBox.Dock = System.Windows.Forms.DockStyle.Bottom;
		System.Windows.Forms.Label label10 = this.loggerBox;
		System.Drawing.Font font6 = new System.Drawing.Font("Microsoft Sans Serif", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label10.Font = font6;
		System.Windows.Forms.Label label11 = this.loggerBox;
		System.Drawing.Color control3 = System.Drawing.SystemColors.Control;
		label11.ForeColor = control3;
		System.Windows.Forms.Label label12 = this.loggerBox;
		System.Drawing.Point location6 = new System.Drawing.Point(0, 789);
		label12.Location = location6;
		this.loggerBox.Name = "loggerBox";
		System.Windows.Forms.Label label13 = this.loggerBox;
		System.Windows.Forms.Padding padding = new System.Windows.Forms.Padding(0, 5, 0, 5);
		label13.Padding = padding;
		System.Windows.Forms.Label label14 = this.loggerBox;
		System.Drawing.Size size6 = new System.Drawing.Size(1119, 37);
		label14.Size = size6;
		this.loggerBox.TabIndex = 486;
		this.loggerBox.Text = "Entrance/Victory ID List";
		System.Windows.Forms.Button button7 = this.btn_SDB;
		System.Drawing.Color steelBlue2 = System.Drawing.Color.SteelBlue;
		button7.BackColor = steelBlue2;
		this.btn_SDB.FlatAppearance.BorderSize = 0;
		this.btn_SDB.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button8 = this.btn_SDB;
		System.Drawing.Font font7 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button8.Font = font7;
		System.Windows.Forms.Button button9 = this.btn_SDB;
		System.Drawing.Color control4 = System.Drawing.SystemColors.Control;
		button9.ForeColor = control4;
		System.Windows.Forms.Button button10 = this.btn_SDB;
		System.Drawing.Point location7 = new System.Drawing.Point(1022, 149);
		button10.Location = location7;
		this.btn_SDB.Name = "btn_SDB";
		System.Windows.Forms.Button button11 = this.btn_SDB;
		System.Drawing.Size size7 = new System.Drawing.Size(71, 29);
		button11.Size = size7;
		this.btn_SDB.TabIndex = 675;
		this.btn_SDB.Text = "SDB";
		this.btn_SDB.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button12 = this.btn_SDB;
		System.EventHandler value3 = new System.EventHandler(this.btn_SDB_Click);
		button12.Click += value3;
		System.Windows.Forms.Button button13 = this.btn_SaveAsNew;
		System.Drawing.Color backColor4 = System.Drawing.Color.FromArgb(40, 40, 40);
		button13.BackColor = backColor4;
		this.btn_SaveAsNew.FlatAppearance.BorderSize = 0;
		this.btn_SaveAsNew.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button14 = this.btn_SaveAsNew;
		System.Drawing.Font font8 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button14.Font = font8;
		System.Windows.Forms.Button button15 = this.btn_SaveAsNew;
		System.Drawing.Color control5 = System.Drawing.SystemColors.Control;
		button15.ForeColor = control5;
		System.Windows.Forms.Button button16 = this.btn_SaveAsNew;
		System.Drawing.Point location8 = new System.Drawing.Point(553, 501);
		button16.Location = location8;
		this.btn_SaveAsNew.Name = "btn_SaveAsNew";
		System.Windows.Forms.Button button17 = this.btn_SaveAsNew;
		System.Drawing.Size size8 = new System.Drawing.Size(540, 39);
		button17.Size = size8;
		this.btn_SaveAsNew.TabIndex = 674;
		this.btn_SaveAsNew.Text = "SAVE AS NEW";
		this.btn_SaveAsNew.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button18 = this.btn_SaveAsNew;
		System.EventHandler value4 = new System.EventHandler(this.btn_SaveAsNew_Click);
		button18.Click += value4;
		this.label3.AutoSize = true;
		System.Windows.Forms.Label label15 = this.label3;
		System.Drawing.Font font9 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label15.Font = font9;
		System.Windows.Forms.Label label16 = this.label3;
		System.Drawing.Color controlLightLight2 = System.Drawing.SystemColors.ControlLightLight;
		label16.ForeColor = controlLightLight2;
		System.Windows.Forms.Label label17 = this.label3;
		System.Drawing.Point location9 = new System.Drawing.Point(549, 187);
		label17.Location = location9;
		this.label3.Name = "label3";
		System.Windows.Forms.Label label18 = this.label3;
		System.Drawing.Size size9 = new System.Drawing.Size(56, 22);
		label18.Size = size9;
		this.label3.TabIndex = 673;
		this.label3.Text = "Type";
		this.label1.AutoSize = true;
		System.Windows.Forms.Label label19 = this.label1;
		System.Drawing.Font font10 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label19.Font = font10;
		System.Windows.Forms.Label label20 = this.label1;
		System.Drawing.Color controlLightLight3 = System.Drawing.SystemColors.ControlLightLight;
		label20.ForeColor = controlLightLight3;
		System.Windows.Forms.Label label21 = this.label1;
		System.Drawing.Point location10 = new System.Drawing.Point(549, 152);
		label21.Location = location10;
		this.label1.Name = "label1";
		System.Windows.Forms.Label label22 = this.label1;
		System.Drawing.Size size10 = new System.Drawing.Size(106, 22);
		label22.Size = size10;
		this.label1.TabIndex = 672;
		this.label1.Text = "Name SDB";
		System.Windows.Forms.TextBox textBox5 = this.input_NameSDBID;
		System.Drawing.Color control6 = System.Drawing.SystemColors.Control;
		textBox5.BackColor = control6;
		System.Windows.Forms.TextBox textBox6 = this.input_NameSDBID;
		System.Drawing.Font font11 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox6.Font = font11;
		System.Windows.Forms.TextBox textBox7 = this.input_NameSDBID;
		System.Drawing.Point location11 = new System.Drawing.Point(740, 149);
		textBox7.Location = location11;
		this.input_NameSDBID.Name = "input_NameSDBID";
		System.Windows.Forms.TextBox textBox8 = this.input_NameSDBID;
		System.Drawing.Size size11 = new System.Drawing.Size(276, 29);
		textBox8.Size = size11;
		this.input_NameSDBID.TabIndex = 671;
		System.Windows.Forms.Button button19 = this.btn_SaveChanges;
		System.Drawing.Color backColor5 = System.Drawing.Color.FromArgb(40, 40, 40);
		button19.BackColor = backColor5;
		this.btn_SaveChanges.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button20 = this.btn_SaveChanges;
		System.Drawing.Font font12 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button20.Font = font12;
		System.Windows.Forms.Button button21 = this.btn_SaveChanges;
		System.Drawing.Color control7 = System.Drawing.SystemColors.Control;
		button21.ForeColor = control7;
		System.Windows.Forms.Button button22 = this.btn_SaveChanges;
		System.Drawing.Point location12 = new System.Drawing.Point(553, 456);
		button22.Location = location12;
		this.btn_SaveChanges.Name = "btn_SaveChanges";
		System.Windows.Forms.Button button23 = this.btn_SaveChanges;
		System.Drawing.Size size12 = new System.Drawing.Size(540, 39);
		button23.Size = size12;
		this.btn_SaveChanges.TabIndex = 670;
		this.btn_SaveChanges.Text = "SAVE CHANGES";
		this.btn_SaveChanges.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button24 = this.btn_SaveChanges;
		System.EventHandler value5 = new System.EventHandler(this.btn_SaveChanges_Click);
		button24.Click += value5;
		this.label10.AutoSize = true;
		System.Windows.Forms.Label label23 = this.label10;
		System.Drawing.Font font13 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label23.Font = font13;
		System.Windows.Forms.Label label24 = this.label10;
		System.Drawing.Color controlLightLight4 = System.Drawing.SystemColors.ControlLightLight;
		label24.ForeColor = controlLightLight4;
		System.Windows.Forms.Label label25 = this.label10;
		System.Drawing.Point location13 = new System.Drawing.Point(549, 117);
		label25.Location = location13;
		this.label10.Name = "label10";
		System.Windows.Forms.Label label26 = this.label10;
		System.Drawing.Size size13 = new System.Drawing.Size(120, 22);
		label26.Size = size13;
		this.label10.TabIndex = 669;
		this.label10.Text = "Cutscene ID";
		System.Windows.Forms.TextBox textBox9 = this.input_cutsceneID;
		System.Drawing.Color control8 = System.Drawing.SystemColors.Control;
		textBox9.BackColor = control8;
		System.Windows.Forms.TextBox textBox10 = this.input_cutsceneID;
		System.Drawing.Font font14 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox10.Font = font14;
		System.Windows.Forms.TextBox textBox11 = this.input_cutsceneID;
		System.Drawing.Point location14 = new System.Drawing.Point(740, 114);
		textBox11.Location = location14;
		this.input_cutsceneID.Name = "input_cutsceneID";
		System.Windows.Forms.TextBox textBox12 = this.input_cutsceneID;
		System.Drawing.Size size14 = new System.Drawing.Size(119, 29);
		textBox12.Size = size14;
		this.input_cutsceneID.TabIndex = 668;
		System.Windows.Forms.Button button25 = this.btn_removeSelected;
		System.Drawing.Color backColor6 = System.Drawing.Color.FromArgb(40, 40, 40);
		button25.BackColor = backColor6;
		this.btn_removeSelected.FlatAppearance.BorderSize = 0;
		this.btn_removeSelected.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button26 = this.btn_removeSelected;
		System.Drawing.Font font15 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button26.Font = font15;
		System.Windows.Forms.Button button27 = this.btn_removeSelected;
		System.Drawing.Color control9 = System.Drawing.SystemColors.Control;
		button27.ForeColor = control9;
		System.Windows.Forms.Button button28 = this.btn_removeSelected;
		System.Drawing.Point location15 = new System.Drawing.Point(17, 727);
		button28.Location = location15;
		this.btn_removeSelected.Name = "btn_removeSelected";
		System.Windows.Forms.Button button29 = this.btn_removeSelected;
		System.Drawing.Size size15 = new System.Drawing.Size(515, 39);
		button29.Size = size15;
		this.btn_removeSelected.TabIndex = 677;
		this.btn_removeSelected.Text = "REMOVE SELECTED";
		this.btn_removeSelected.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button30 = this.btn_removeSelected;
		System.EventHandler value6 = new System.EventHandler(this.btn_removeSelected_Click);
		button30.Click += value6;
		System.Windows.Forms.Button button31 = this.btn_EditSelected;
		System.Drawing.Color backColor7 = System.Drawing.Color.FromArgb(40, 40, 40);
		button31.BackColor = backColor7;
		this.btn_EditSelected.FlatAppearance.BorderSize = 0;
		this.btn_EditSelected.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button32 = this.btn_EditSelected;
		System.Drawing.Font font16 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button32.Font = font16;
		System.Windows.Forms.Button button33 = this.btn_EditSelected;
		System.Drawing.Color control10 = System.Drawing.SystemColors.Control;
		button33.ForeColor = control10;
		System.Windows.Forms.Button button34 = this.btn_EditSelected;
		System.Drawing.Point location16 = new System.Drawing.Point(17, 682);
		button34.Location = location16;
		this.btn_EditSelected.Name = "btn_EditSelected";
		System.Windows.Forms.Button button35 = this.btn_EditSelected;
		System.Drawing.Size size16 = new System.Drawing.Size(515, 39);
		button35.Size = size16;
		this.btn_EditSelected.TabIndex = 676;
		this.btn_EditSelected.Text = "EDIT SELECTED";
		this.btn_EditSelected.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button36 = this.btn_EditSelected;
		System.EventHandler value7 = new System.EventHandler(this.btn_EditSelected_Click);
		button36.Click += value7;
		System.Windows.Forms.ComboBox comboBox = this.cbType;
		System.Drawing.Font font17 = new System.Drawing.Font("Microsoft YaHei", 10f);
		comboBox.Font = font17;
		this.cbType.FormattingEnabled = true;
		object[] items = new object[10] { "0 - None", "1 - Entrance", "2 - Title Entrance", "3 - MITB Entrance", "4 - Double Title", "5 - Victory - Face", "6 - Victory - Heel", "7 - Title Victory - Face", "8 - Title Victory - Heel", "9 - Double Title Victory" };
		this.cbType.Items.AddRange(items);
		System.Windows.Forms.ComboBox comboBox2 = this.cbType;
		System.Drawing.Point location17 = new System.Drawing.Point(740, 184);
		comboBox2.Location = location17;
		this.cbType.Name = "cbType";
		System.Windows.Forms.ComboBox comboBox3 = this.cbType;
		System.Drawing.Size size17 = new System.Drawing.Size(353, 31);
		comboBox3.Size = size17;
		this.cbType.TabIndex = 678;
		this.label2.AutoSize = true;
		System.Windows.Forms.Label label27 = this.label2;
		System.Drawing.Font font18 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label27.Font = font18;
		System.Windows.Forms.Label label28 = this.label2;
		System.Drawing.Color controlLightLight5 = System.Drawing.SystemColors.ControlLightLight;
		label28.ForeColor = controlLightLight5;
		System.Windows.Forms.Label label29 = this.label2;
		System.Drawing.Point location18 = new System.Drawing.Point(549, 224);
		label29.Location = location18;
		this.label2.Name = "label2";
		System.Windows.Forms.Label label30 = this.label2;
		System.Drawing.Size size18 = new System.Drawing.Size(157, 22);
		label30.Size = size18;
		this.label2.TabIndex = 680;
		this.label2.Text = "Num Characters";
		System.Windows.Forms.TextBox textBox13 = this.input_numCharacters;
		System.Drawing.Color control11 = System.Drawing.SystemColors.Control;
		textBox13.BackColor = control11;
		System.Windows.Forms.TextBox textBox14 = this.input_numCharacters;
		System.Drawing.Font font19 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox14.Font = font19;
		System.Windows.Forms.TextBox textBox15 = this.input_numCharacters;
		System.Drawing.Point location19 = new System.Drawing.Point(740, 221);
		textBox15.Location = location19;
		this.input_numCharacters.Name = "input_numCharacters";
		System.Windows.Forms.TextBox textBox16 = this.input_numCharacters;
		System.Drawing.Size size19 = new System.Drawing.Size(119, 29);
		textBox16.Size = size19;
		this.input_numCharacters.TabIndex = 679;
		this.label5.AutoSize = true;
		System.Windows.Forms.Label label31 = this.label5;
		System.Drawing.Font font20 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label31.Font = font20;
		System.Windows.Forms.Label label32 = this.label5;
		System.Drawing.Color controlLightLight6 = System.Drawing.SystemColors.ControlLightLight;
		label32.ForeColor = controlLightLight6;
		System.Windows.Forms.Label label33 = this.label5;
		System.Drawing.Point location20 = new System.Drawing.Point(549, 259);
		label33.Location = location20;
		this.label5.Name = "label5";
		System.Windows.Forms.Label label34 = this.label5;
		System.Drawing.Size size20 = new System.Drawing.Size(142, 22);
		label34.Size = size20;
		this.label5.TabIndex = 682;
		this.label5.Text = "Default Char 1";
		System.Windows.Forms.TextBox textBox17 = this.input_defaultChar1;
		System.Drawing.Color control12 = System.Drawing.SystemColors.Control;
		textBox17.BackColor = control12;
		System.Windows.Forms.TextBox textBox18 = this.input_defaultChar1;
		System.Drawing.Font font21 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox18.Font = font21;
		System.Windows.Forms.TextBox textBox19 = this.input_defaultChar1;
		System.Drawing.Point location21 = new System.Drawing.Point(740, 256);
		textBox19.Location = location21;
		this.input_defaultChar1.Name = "input_defaultChar1";
		System.Windows.Forms.TextBox textBox20 = this.input_defaultChar1;
		System.Drawing.Size size21 = new System.Drawing.Size(119, 29);
		textBox20.Size = size21;
		this.input_defaultChar1.TabIndex = 681;
		this.label6.AutoSize = true;
		System.Windows.Forms.Label label35 = this.label6;
		System.Drawing.Font font22 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label35.Font = font22;
		System.Windows.Forms.Label label36 = this.label6;
		System.Drawing.Color controlLightLight7 = System.Drawing.SystemColors.ControlLightLight;
		label36.ForeColor = controlLightLight7;
		System.Windows.Forms.Label label37 = this.label6;
		System.Drawing.Point location22 = new System.Drawing.Point(549, 294);
		label37.Location = location22;
		this.label6.Name = "label6";
		System.Windows.Forms.Label label38 = this.label6;
		System.Drawing.Size size22 = new System.Drawing.Size(142, 22);
		label38.Size = size22;
		this.label6.TabIndex = 684;
		this.label6.Text = "Default Char 2";
		System.Windows.Forms.TextBox textBox21 = this.input_defaultChar2;
		System.Drawing.Color control13 = System.Drawing.SystemColors.Control;
		textBox21.BackColor = control13;
		System.Windows.Forms.TextBox textBox22 = this.input_defaultChar2;
		System.Drawing.Font font23 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox22.Font = font23;
		System.Windows.Forms.TextBox textBox23 = this.input_defaultChar2;
		System.Drawing.Point location23 = new System.Drawing.Point(740, 291);
		textBox23.Location = location23;
		this.input_defaultChar2.Name = "input_defaultChar2";
		System.Windows.Forms.TextBox textBox24 = this.input_defaultChar2;
		System.Drawing.Size size23 = new System.Drawing.Size(119, 29);
		textBox24.Size = size23;
		this.input_defaultChar2.TabIndex = 683;
		this.label7.AutoSize = true;
		System.Windows.Forms.Label label39 = this.label7;
		System.Drawing.Font font24 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label39.Font = font24;
		System.Windows.Forms.Label label40 = this.label7;
		System.Drawing.Color controlLightLight8 = System.Drawing.SystemColors.ControlLightLight;
		label40.ForeColor = controlLightLight8;
		System.Windows.Forms.Label label41 = this.label7;
		System.Drawing.Point location24 = new System.Drawing.Point(549, 329);
		label41.Location = location24;
		this.label7.Name = "label7";
		System.Windows.Forms.Label label42 = this.label7;
		System.Drawing.Size size24 = new System.Drawing.Size(142, 22);
		label42.Size = size24;
		this.label7.TabIndex = 686;
		this.label7.Text = "Default Char 3";
		System.Windows.Forms.TextBox textBox25 = this.input_defaultChar3;
		System.Drawing.Color control14 = System.Drawing.SystemColors.Control;
		textBox25.BackColor = control14;
		System.Windows.Forms.TextBox textBox26 = this.input_defaultChar3;
		System.Drawing.Font font25 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox26.Font = font25;
		System.Windows.Forms.TextBox textBox27 = this.input_defaultChar3;
		System.Drawing.Point location25 = new System.Drawing.Point(740, 326);
		textBox27.Location = location25;
		this.input_defaultChar3.Name = "input_defaultChar3";
		System.Windows.Forms.TextBox textBox28 = this.input_defaultChar3;
		System.Drawing.Size size25 = new System.Drawing.Size(119, 29);
		textBox28.Size = size25;
		this.input_defaultChar3.TabIndex = 685;
		this.label8.AutoSize = true;
		System.Windows.Forms.Label label43 = this.label8;
		System.Drawing.Font font26 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label43.Font = font26;
		System.Windows.Forms.Label label44 = this.label8;
		System.Drawing.Color controlLightLight9 = System.Drawing.SystemColors.ControlLightLight;
		label44.ForeColor = controlLightLight9;
		System.Windows.Forms.Label label45 = this.label8;
		System.Drawing.Point location26 = new System.Drawing.Point(549, 364);
		label45.Location = location26;
		this.label8.Name = "label8";
		System.Windows.Forms.Label label46 = this.label8;
		System.Drawing.Size size26 = new System.Drawing.Size(142, 22);
		label46.Size = size26;
		this.label8.TabIndex = 688;
		this.label8.Text = "Default Char 4";
		System.Windows.Forms.TextBox textBox29 = this.input_defaultChar4;
		System.Drawing.Color control15 = System.Drawing.SystemColors.Control;
		textBox29.BackColor = control15;
		System.Windows.Forms.TextBox textBox30 = this.input_defaultChar4;
		System.Drawing.Font font27 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox30.Font = font27;
		System.Windows.Forms.TextBox textBox31 = this.input_defaultChar4;
		System.Drawing.Point location27 = new System.Drawing.Point(740, 361);
		textBox31.Location = location27;
		this.input_defaultChar4.Name = "input_defaultChar4";
		System.Windows.Forms.TextBox textBox32 = this.input_defaultChar4;
		System.Drawing.Size size27 = new System.Drawing.Size(119, 29);
		textBox32.Size = size27;
		this.input_defaultChar4.TabIndex = 687;
		this.label9.AutoSize = true;
		System.Windows.Forms.Label label47 = this.label9;
		System.Drawing.Font font28 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label47.Font = font28;
		System.Windows.Forms.Label label48 = this.label9;
		System.Drawing.Color controlLightLight10 = System.Drawing.SystemColors.ControlLightLight;
		label48.ForeColor = controlLightLight10;
		System.Windows.Forms.Label label49 = this.label9;
		System.Drawing.Point location28 = new System.Drawing.Point(549, 399);
		label49.Location = location28;
		this.label9.Name = "label9";
		System.Windows.Forms.Label label50 = this.label9;
		System.Drawing.Size size28 = new System.Drawing.Size(142, 22);
		label50.Size = size28;
		this.label9.TabIndex = 690;
		this.label9.Text = "Default Char 5";
		System.Windows.Forms.TextBox textBox33 = this.input_defaultChar5;
		System.Drawing.Color control16 = System.Drawing.SystemColors.Control;
		textBox33.BackColor = control16;
		System.Windows.Forms.TextBox textBox34 = this.input_defaultChar5;
		System.Drawing.Font font29 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox34.Font = font29;
		System.Windows.Forms.TextBox textBox35 = this.input_defaultChar5;
		System.Drawing.Point location29 = new System.Drawing.Point(740, 396);
		textBox35.Location = location29;
		this.input_defaultChar5.Name = "input_defaultChar5";
		System.Windows.Forms.TextBox textBox36 = this.input_defaultChar5;
		System.Drawing.Size size29 = new System.Drawing.Size(119, 29);
		textBox36.Size = size29;
		this.input_defaultChar5.TabIndex = 689;
		System.Drawing.SizeF sizeF = new System.Drawing.SizeF(8f, 16f);
		base.AutoScaleDimensions = sizeF;
		base.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
		System.Drawing.Color backColor8 = System.Drawing.Color.FromArgb(20, 20, 20);
		this.BackColor = backColor8;
		System.Drawing.Size clientSize = new System.Drawing.Size(1119, 826);
		base.ClientSize = clientSize;
		base.Controls.Add(this.label9);
		base.Controls.Add(this.input_defaultChar5);
		base.Controls.Add(this.label8);
		base.Controls.Add(this.input_defaultChar4);
		base.Controls.Add(this.label7);
		base.Controls.Add(this.input_defaultChar3);
		base.Controls.Add(this.label6);
		base.Controls.Add(this.input_defaultChar2);
		base.Controls.Add(this.label5);
		base.Controls.Add(this.input_defaultChar1);
		base.Controls.Add(this.label2);
		base.Controls.Add(this.input_numCharacters);
		base.Controls.Add(this.cbType);
		base.Controls.Add(this.btn_removeSelected);
		base.Controls.Add(this.btn_EditSelected);
		base.Controls.Add(this.btn_SDB);
		base.Controls.Add(this.btn_SaveAsNew);
		base.Controls.Add(this.label3);
		base.Controls.Add(this.label1);
		base.Controls.Add(this.input_NameSDBID);
		base.Controls.Add(this.btn_SaveChanges);
		base.Controls.Add(this.label10);
		base.Controls.Add(this.input_cutsceneID);
		base.Controls.Add(this.loggerBox);
		base.Controls.Add(this.label4);
		base.Controls.Add(this.input_searchBox);
		base.Controls.Add(this.label18);
		base.Controls.Add(this.btn_LoadIDList);
		base.Controls.Add(this.list_charMaps);
		base.Icon = (System.Drawing.Icon)resources.GetObject("$this.Icon");
		System.Drawing.Size minimumSize = new System.Drawing.Size(1137, 873);
		this.MinimumSize = minimumSize;
		base.Name = "CutsceneIDList";
		base.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
		this.Text = "Entrance/Victory ID List";
		base.ResumeLayout(false);
		base.PerformLayout();
	}

	private unsafe void btn_LoadIDList_Click(object sender, EventArgs e)
	{
		//IL_00b6: Expected I, but got I8
		//IL_011d: Expected I, but got I8
		//IL_0124: Expected I, but got I8
		//IL_0561: Expected I, but got I8
		//IL_0296: Expected I, but got I8
		//IL_0223: Expected I, but got I8
		marshal_context marshal_context2 = null;
		string text = null;
		uint num = 0u;
		input_cutsceneID.Text = "";
		input_NameSDBID.Text = "";
		cbType.SelectedIndex = -1;
		input_numCharacters.Text = "";
		input_defaultChar1.Text = "";
		input_defaultChar2.Text = "";
		input_defaultChar3.Text = "";
		input_defaultChar4.Text = "";
		input_defaultChar5.Text = "";
		<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >.clear((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?CutIdList_OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A));
		<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?CutIdList_OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
		<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?CutIdList_FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
		void* ptr = null;
		<Module>.GetSDB(&ptr);
		if (!<Module>.isSDBPresent(ptr))
		{
			MessageBox.Show("Failed to find your SDB file!\n\nMake sure your SDB file is in your BakeMe/Sdb folder and it matches your chosen language!\n", "Hold up!", MessageBoxButtons.OK, MessageBoxIcon.Asterisk);
			loggerBox.Text = "FAILED! Can't find your SDB!";
			loggerBox.Refresh();
			GC.KeepAlive(this);
			return;
		}
		marshal_context marshal_context3 = new marshal_context();
		try
		{
			marshal_context2 = marshal_context3;
			System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<Cutscene_Registy,std::allocator<Cutscene_Registy> > obj);
			<Module>.GetAllCutsceneRegistry(&obj);
			try
			{
				System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<Cutscene_Registry_WithSDBString,std::allocator<Cutscene_Registry_WithSDBString> > obj2);
				<Module>.std.vector<Cutscene_Registry_WithSDBString,std::allocator<Cutscene_Registry_WithSDBString> >.{ctor}(&obj2);
				try
				{
					Cutscene_Registy* ptr2 = (Cutscene_Registy*)(*(ulong*)(&obj));
					Cutscene_Registy* ptr3 = (Cutscene_Registy*)System.Runtime.CompilerServices.Unsafe.As<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >, ulong>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj, 8));
					if (*(long*)(&obj) != System.Runtime.CompilerServices.Unsafe.As<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj, 8)))
					{
						System.Runtime.CompilerServices.Unsafe.SkipInit(out Cutscene_Registy cutscene_Registy);
						System.Runtime.CompilerServices.Unsafe.SkipInit(out Cutscene_Registry_WithSDBString cutscene_Registry_WithSDBString);
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj3);
						do
						{
							<Module>.Cutscene_Registy.{ctor}(&cutscene_Registy, ptr2);
							try
							{
								<Module>.Cutscene_Registry_WithSDBString.{ctor}(&cutscene_Registry_WithSDBString);
								try
								{
									uint num2 = ((System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 4)) != 0) ? (*(uint*)(&cutscene_Registy)) : 0u);
									*(uint*)(&cutscene_Registry_WithSDBString) = num2;
									byte b = (byte)((System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 19)) != 0) ? System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 18)) : 0);
									System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registry_WithSDBString, int>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registry_WithSDBString, 40)) = b;
									uint guid = ((System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 12)) != 0) ? System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 8)) : 0u);
									void* sdb = ptr;
									basic_string<char,std::char_traits<char>,std::allocator<char> >* stringFromSDB = <Module>.GetStringFromSDB(&obj3, sdb, guid);
									try
									{
										<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.=((basic_string<char,std::char_traits<char>,std::allocator<char> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registry_WithSDBString, 8)), stringFromSDB);
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj3);
										throw;
									}
									try
									{
										<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj3);
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj3);
										throw;
									}
									<Module>.std.vector<Cutscene_Registry_WithSDBString,std::allocator<Cutscene_Registry_WithSDBString> >._Emplace_one_at_back<struct Cutscene_Registry_WithSDBString const &>(&obj2, &cutscene_Registry_WithSDBString);
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<Cutscene_Registry_WithSDBString*, void>)(&<Module>.Cutscene_Registry_WithSDBString.{dtor}), &cutscene_Registry_WithSDBString);
									throw;
								}
								basic_string<char,std::char_traits<char>,std::allocator<char> >* pThis = (basic_string<char,std::char_traits<char>,std::allocator<char> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registry_WithSDBString, 8));
								try
								{
									<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate((basic_string<char,std::char_traits<char>,std::allocator<char> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registry_WithSDBString, 8)));
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), pThis);
									throw;
								}
							}
							catch
							{
								//try-fault
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<Cutscene_Registy*, void>)(&<Module>.Cutscene_Registy.{dtor}), &cutscene_Registy);
								throw;
							}
							<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Tidy((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)));
							ptr2 = (Cutscene_Registy*)((ulong)(nint)ptr2 + 80uL);
						}
						while (ptr2 != ptr3);
					}
					list_charMaps.Items.Clear();
					int num3 = 0;
					if (0uL < (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<Cutscene_Registry_WithSDBString,std::allocator<Cutscene_Registry_WithSDBString> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj2, 8)) - *(long*)(&obj2)) / 48))
					{
						ulong num4 = 0uL;
						long num5 = 0L;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj4);
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj5);
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj6);
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj7);
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj8);
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj9);
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj10);
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj11);
						do
						{
							long num6 = *(long*)(&obj2) + num5;
							uint val = *(uint*)num6;
							uint val2 = *(uint*)(num6 + 40);
							<Module>.std.to_string(&obj4, val);
							try
							{
								<Module>.std.to_string(&obj5, val2);
								try
								{
									<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj6, (basic_string<char,std::char_traits<char>,std::allocator<char> >*)(*(long*)(&obj2) + (long)(num4 * 48) + 8));
									try
									{
										if (System.Runtime.CompilerServices.Unsafe.As<basic_string<char,std::char_traits<char>,std::allocator<char> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj6, 16)) == 0)
										{
											<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.=(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0M@FEICBPOG@NO?5SDB?5NAME@));
										}
										basic_string<char,std::char_traits<char>,std::allocator<char> >* left = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj7, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06NAHGBCDG@Type?3?5@), &obj5);
										try
										{
											basic_string<char,std::char_traits<char>,std::allocator<char> >* left2 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj8, left, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06JAMPMHOJ@?0?5ID?3?5@));
											try
											{
												basic_string<char,std::char_traits<char>,std::allocator<char> >* left3 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj9, left2, &obj4);
												try
												{
													basic_string<char,std::char_traits<char>,std::allocator<char> >* left4 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj10, left3, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_02KEGNLNML@?0?5@));
													try
													{
														<Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj11, left4, &obj6);
													}
													catch
													{
														//try-fault
														<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
														throw;
													}
													try
													{
														try
														{
															<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj10);
														}
														catch
														{
															//try-fault
															<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj10);
															throw;
														}
													}
													catch
													{
														//try-fault
														<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
														throw;
													}
												}
												catch
												{
													//try-fault
													<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj9);
													throw;
												}
												try
												{
													try
													{
														<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj9);
													}
													catch
													{
														//try-fault
														<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj9);
														throw;
													}
												}
												catch
												{
													//try-fault
													<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
													throw;
												}
											}
											catch
											{
												//try-fault
												<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj8);
												throw;
											}
											try
											{
												try
												{
													<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj8);
												}
												catch
												{
													//try-fault
													<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj8);
													throw;
												}
											}
											catch
											{
												//try-fault
												<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
												throw;
											}
										}
										catch
										{
											//try-fault
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj7);
											throw;
										}
										try
										{
											try
											{
												<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj7);
											}
											catch
											{
												//try-fault
												<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj7);
												throw;
											}
											ListBox.ObjectCollection items = list_charMaps.Items;
											string item = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(&obj11);
											items.Add(item);
										}
										catch
										{
											//try-fault
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
											throw;
										}
										try
										{
											<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj11);
										}
										catch
										{
											//try-fault
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj11);
											throw;
										}
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj6);
										throw;
									}
									try
									{
										<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj6);
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj6);
										throw;
									}
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj5);
									throw;
								}
								try
								{
									<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj5);
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj5);
									throw;
								}
							}
							catch
							{
								//try-fault
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj4);
								throw;
							}
							try
							{
								<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj4);
							}
							catch
							{
								//try-fault
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj4);
								throw;
							}
							num3++;
							num5 += 48;
							num4 = (ulong)num3;
						}
						while (num4 < (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<Cutscene_Registry_WithSDBString,std::allocator<Cutscene_Registry_WithSDBString> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj2, 8)) - *(long*)(&obj2)) / 48));
					}
					if (System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?CutIdList_OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) == System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?CutIdList_OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)))
					{
						int num7 = 0;
						if (num7 < list_charMaps.Items.Count)
						{
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj12);
							do
							{
								ListBox.ObjectCollection items2 = list_charMaps.Items;
								int index = num7;
								text = items2[index].ToString();
								<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj12, &text);
								try
								{
									<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >._Emplace_one_at_back<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > const &>((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?CutIdList_OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A), &obj12);
									<Module>.std.vector<int,std::allocator<int> >._Emplace_one_at_back<int const &>((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?CutIdList_OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A), &num7);
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj12);
									throw;
								}
								try
								{
									<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj12);
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj12);
									throw;
								}
								num7++;
							}
							while (num7 < list_charMaps.Items.Count);
						}
					}
					<Module>.DeleteSDB(ptr);
					ptr = null;
					loggerBox.Text = "ID List Loaded!";
					loggerBox.Refresh();
				}
				catch
				{
					//try-fault
					<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<Cutscene_Registry_WithSDBString,std::allocator<Cutscene_Registry_WithSDBString> >*, void>)(&<Module>.std.vector<Cutscene_Registry_WithSDBString,std::allocator<Cutscene_Registry_WithSDBString> >.{dtor}), &obj2);
					throw;
				}
				<Module>.std.vector<Cutscene_Registry_WithSDBString,std::allocator<Cutscene_Registry_WithSDBString> >._Tidy(&obj2);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >*, void>)(&<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{dtor}), &obj);
				throw;
			}
			<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >._Tidy(&obj);
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		((IDisposable)marshal_context2).Dispose();
		GC.KeepAlive(this);
	}

	private unsafe void input_searchBox_TextChanged(object sender, EventArgs e)
	{
		//IL_004c: Expected I, but got I8
		//IL_0081: Expected I, but got I8
		string value = input_searchBox.Text;
		list_charMaps.Items.Clear();
		System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<int,std::allocator<int> > obj);
		<Module>.std.vector<int,std::allocator<int> >.{ctor}(&obj);
		try
		{
			ulong num = 0uL;
			if (0uL < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?CutIdList_OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)) - System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?CutIdList_OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) >> 5))
			{
				long num2 = 0L;
				do
				{
					string text = new string(<Module>.std._String_val<std::_Simple_types<char> >._Myptr((_String_val<std::_Simple_types<char> >*)(num2 + System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?CutIdList_OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A))));
					if (text.IndexOf(value, StringComparison.OrdinalIgnoreCase) != -1)
					{
						list_charMaps.Items.Add(text);
						<Module>.std.vector<int,std::allocator<int> >._Emplace_one_at_back<int const &>(&obj, (int*)(num * 4 + (ulong)System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?CutIdList_OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A)));
					}
					num++;
					num2 += 32;
				}
				while (num < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?CutIdList_OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)) - System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?CutIdList_OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) >> 5));
			}
			<Module>.std.vector<int,std::allocator<int> >.=((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?CutIdList_FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A), &obj);
			if (list_charMaps.Items.Count > 0)
			{
				list_charMaps.SelectedIndex = 0;
			}
			else
			{
				list_charMaps.SelectedIndex = -1;
			}
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<int,std::allocator<int> >*, void>)(&<Module>.std.vector<int,std::allocator<int> >.{dtor}), &obj);
			throw;
		}
		<Module>.std.vector<int,std::allocator<int> >._Tidy(&obj);
		GC.KeepAlive(this);
	}

	private unsafe int GetOriginalIndexOfSelectedItem()
	{
		if (list_charMaps.SelectedIndex == -1)
		{
			GC.KeepAlive(this);
			return -1;
		}
		int selectedIndex = list_charMaps.SelectedIndex;
		if (System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?CutIdList_FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A) == System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?CutIdList_FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A, 8)))
		{
			if (selectedIndex >= 0)
			{
				ulong num = (ulong)selectedIndex;
				if (num < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?CutIdList_OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A, 8)) - System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?CutIdList_OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A) >> 2))
				{
					int result = *(int*)(num * 4 + (ulong)System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?CutIdList_OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
					GC.KeepAlive(this);
					return result;
				}
			}
			GC.KeepAlive(this);
			return -1;
		}
		if (selectedIndex >= 0)
		{
			ulong num2 = (ulong)selectedIndex;
			if (num2 < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?CutIdList_FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A, 8)) - System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?CutIdList_FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A) >> 2))
			{
				int result2 = *(int*)(num2 * 4 + (ulong)System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?CutIdList_FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
				GC.KeepAlive(this);
				return result2;
			}
		}
		GC.KeepAlive(this);
		return -1;
	}

	private unsafe void btn_EditSelected_Click(object sender, EventArgs e)
	{
		//IL_00ce: Expected I, but got I8
		input_cutsceneID.Text = "";
		input_NameSDBID.Text = "";
		cbType.SelectedIndex = -1;
		input_numCharacters.Text = "";
		input_defaultChar1.Text = "";
		input_defaultChar2.Text = "";
		input_defaultChar3.Text = "";
		input_defaultChar4.Text = "";
		input_defaultChar5.Text = "";
		int originalIndexOfSelectedItem = GetOriginalIndexOfSelectedItem();
		if (originalIndexOfSelectedItem == -1)
		{
			MessageBox.Show("No item selected or invalid selection.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Hand);
			GC.KeepAlive(this);
			return;
		}
		System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<Cutscene_Registy,std::allocator<Cutscene_Registy> > obj);
		<Module>.GetAllCutsceneRegistry(&obj);
		try
		{
			System.Runtime.CompilerServices.Unsafe.SkipInit(out Cutscene_Registy cutscene_Registy);
			<Module>.Cutscene_Registy.{ctor}(&cutscene_Registy, (Cutscene_Registy*)((long)originalIndexOfSelectedItem * 80L + *(long*)(&obj)));
			try
			{
				TextBox textBox = input_cutsceneID;
				string text;
				if (System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 4)) != 0)
				{
					uint num = *(uint*)(&cutscene_Registy);
					text = num.ToString();
				}
				else
				{
					text = "";
				}
				textBox.Text = text;
				TextBox textBox2 = input_NameSDBID;
				string text2;
				if (System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 12)) != 0)
				{
					uint num2 = System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 8));
					text2 = num2.ToString();
				}
				else
				{
					text2 = "";
				}
				textBox2.Text = text2;
				if (System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 19)) != 0)
				{
					ComboBox comboBox = cbType;
					int selectedIndex = System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 18));
					comboBox.SelectedIndex = selectedIndex;
				}
				else
				{
					cbType.SelectedIndex = -1;
				}
				TextBox textBox3 = input_numCharacters;
				string text3;
				if (System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 17)) != 0)
				{
					byte b = System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 16));
					text3 = b.ToString();
				}
				else
				{
					text3 = "1";
				}
				textBox3.Text = text3;
				if (System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 32)) - System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) >> 1 != 0)
				{
					TextBox textBox4 = input_defaultChar1;
					ushort num3 = *(ushort*)System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, ulong>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24));
					string text4 = num3.ToString();
					textBox4.Text = text4;
				}
				if ((ulong)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 32)) - System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) >> 1) > 1uL)
				{
					TextBox textBox5 = input_defaultChar2;
					ushort num4 = *(ushort*)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) + 2);
					string text5 = num4.ToString();
					textBox5.Text = text5;
				}
				if ((ulong)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 32)) - System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) >> 1) > 2uL)
				{
					TextBox textBox6 = input_defaultChar3;
					ushort num5 = *(ushort*)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) + 4);
					string text6 = num5.ToString();
					textBox6.Text = text6;
				}
				if ((ulong)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 32)) - System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) >> 1) > 3uL)
				{
					TextBox textBox7 = input_defaultChar4;
					ushort num6 = *(ushort*)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) + 6);
					string text7 = num6.ToString();
					textBox7.Text = text7;
				}
				if ((ulong)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 32)) - System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) >> 1) > 4uL)
				{
					TextBox textBox8 = input_defaultChar5;
					ushort num7 = *(ushort*)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) + 8);
					string text8 = num7.ToString();
					textBox8.Text = text8;
				}
				loggerBox.Text = "Loaded selected cutscene for editing";
				loggerBox.Refresh();
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<Cutscene_Registy*, void>)(&<Module>.Cutscene_Registy.{dtor}), &cutscene_Registy);
				throw;
			}
			<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Tidy((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)));
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >*, void>)(&<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{dtor}), &obj);
			throw;
		}
		<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >._Tidy(&obj);
		GC.KeepAlive(this);
	}

	private unsafe void btn_removeSelected_Click(object sender, EventArgs e)
	{
		int originalIndexOfSelectedItem = GetOriginalIndexOfSelectedItem();
		if (originalIndexOfSelectedItem == -1)
		{
			MessageBox.Show("No item selected or invalid selection.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Hand);
			GC.KeepAlive(this);
			return;
		}
		System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<Cutscene_Registy,std::allocator<Cutscene_Registy> > obj);
		<Module>.GetAllCutsceneRegistry(&obj);
		try
		{
			System.Runtime.CompilerServices.Unsafe.SkipInit(out _Vector_const_iterator<std::_Vector_val<std::_Simple_types<Cutscene_Registy> > > obj2);
			*(long*)(&obj2) = (long)originalIndexOfSelectedItem * 80L + *(long*)(&obj);
			System.Runtime.CompilerServices.Unsafe.SkipInit(out _Vector_iterator<std::_Vector_val<std::_Simple_types<Cutscene_Registy> > > obj3);
			<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.erase(&obj, &obj3, obj2);
			System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<Cutscene_Registy,std::allocator<Cutscene_Registy> > obj4);
			vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >* ptr = &obj4;
			vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >* cutsceneVector = <Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{ctor}(&obj4, &obj);
			<Module>.WriteAllCutsceneRegistryDataToFile(cutsceneVector);
			btn_LoadIDList_Click(null, null);
			loggerBox.Text = "Removed selected cutscene from the list";
			loggerBox.Refresh();
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >*, void>)(&<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{dtor}), &obj);
			throw;
		}
		<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >._Tidy(&obj);
		GC.KeepAlive(this);
	}

	private unsafe void btn_SaveChanges_Click(object sender, EventArgs e)
	{
		//IL_003f: Expected I, but got I8
		//IL_0106: Expected I, but got I8
		//IL_0154: Expected I, but got I8
		//IL_01a4: Expected I, but got I8
		//IL_01d4: Expected I, but got I8
		int originalIndexOfSelectedItem = GetOriginalIndexOfSelectedItem();
		if (originalIndexOfSelectedItem == -1)
		{
			MessageBox.Show("No item selected or invalid selection.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Hand);
			GC.KeepAlive(this);
			return;
		}
		System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<Cutscene_Registy,std::allocator<Cutscene_Registy> > obj);
		<Module>.GetAllCutsceneRegistry(&obj);
		Cutscene_Registy* ptr;
		try
		{
			ptr = (Cutscene_Registy*)((long)originalIndexOfSelectedItem * 80L + *(long*)(&obj));
			if (input_cutsceneID.Text.Length == 0)
			{
				MessageBox.Show("Cutscene ID cannot be empty.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Hand);
				GC.KeepAlive(this);
				goto IL_007c;
			}
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >*, void>)(&<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{dtor}), &obj);
			throw;
		}
		try
		{
			if (uint.TryParse(input_cutsceneID.Text, out var result))
			{
				System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj2);
				*(uint*)(&obj2) = result;
				System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj2, 4)) = 1;
				// IL cpblk instruction
				System.Runtime.CompilerServices.Unsafe.CopyBlock(ptr, ref obj2, 8);
			}
			if (uint.TryParse(input_NameSDBID.Text, out var result2))
			{
				System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj3);
				*(uint*)(&obj3) = result2;
				System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj3, 4)) = 1;
				// IL cpblk instruction
				System.Runtime.CompilerServices.Unsafe.CopyBlock((long)(nint)ptr + 8L, ref obj3, 8);
			}
			else
			{
				*(sbyte*)((ulong)(nint)ptr + 12uL) = 0;
			}
			if (cbType.SelectedIndex != -1)
			{
				int selectedIndex = cbType.SelectedIndex;
				<Module>.std.optional<unsigned char>.operator=<int,0>((optional<unsigned char>*)((ulong)(nint)ptr + 18uL), &selectedIndex);
			}
			else
			{
				*(sbyte*)((ulong)(nint)ptr + 19uL) = 0;
			}
			System.Runtime.CompilerServices.Unsafe.SkipInit(out uint result3);
			if (input_numCharacters.Text.Length > 0)
			{
				if (uint.TryParse(input_numCharacters.Text, out result3))
				{
					if (result3 < 2)
					{
						*(sbyte*)((long)(nint)ptr + 16L + 1) = 0;
					}
					else
					{
						<Module>.std._Optional_construct_base<unsigned char>._Assign<unsigned int &>((_Optional_construct_base<unsigned char>*)((ulong)(nint)ptr + 16uL), &result3);
					}
				}
				else
				{
					*(sbyte*)((ulong)(nint)ptr + 17uL) = 0;
				}
			}
			else
			{
				*(sbyte*)((long)(nint)ptr + 16L + 1) = 0;
			}
			if (input_defaultChar1.Text.Length > 0 && result3 != 0 && uint.TryParse(input_defaultChar1.Text, out var result4))
			{
				Cutscene_Registy* ptr2 = (Cutscene_Registy*)((ulong)(nint)ptr + 24uL);
				<Module>.std.vector<unsigned short,std::allocator<unsigned short> >.clear((vector<unsigned short,std::allocator<unsigned short> >*)ptr2);
				ushort num = (ushort)result4;
				<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)ptr2, &num);
				if (input_defaultChar2.Text.Length > 0)
				{
					Cutscene_Registy* ptr3 = (Cutscene_Registy*)((ulong)(nint)ptr + 16uL);
					optional<unsigned char>* ptr4 = (optional<unsigned char>*)ptr3;
					if (*(byte*)((ulong)(nint)ptr4 + 1uL) != 0 && (uint)(*(byte*)ptr4) > 1u)
					{
						if (uint.TryParse(input_defaultChar2.Text, out var result5))
						{
							ushort num2 = (ushort)result5;
							<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)ptr2, &num2);
						}
						if (input_defaultChar3.Text.Length > 0)
						{
							optional<unsigned char>* ptr5 = (optional<unsigned char>*)ptr3;
							if (*(byte*)((ulong)(nint)ptr5 + 1uL) != 0 && (uint)(*(byte*)ptr5) > 2u)
							{
								if (uint.TryParse(input_defaultChar3.Text, out var result6))
								{
									ushort num3 = (ushort)result6;
									<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)ptr2, &num3);
								}
								if (input_defaultChar4.Text.Length > 0)
								{
									optional<unsigned char>* ptr6 = (optional<unsigned char>*)ptr3;
									if (*(byte*)((ulong)(nint)ptr6 + 1uL) != 0 && (uint)(*(byte*)ptr6) > 3u)
									{
										if (uint.TryParse(input_defaultChar4.Text, out var result7))
										{
											ushort num4 = (ushort)result7;
											<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)ptr2, &num4);
										}
										if (input_defaultChar5.Text.Length > 0)
										{
											optional<unsigned char>* ptr7 = (optional<unsigned char>*)ptr3;
											if (*(byte*)((ulong)(nint)ptr7 + 1uL) != 0 && (uint)(*(byte*)ptr7) > 4u && uint.TryParse(input_defaultChar5.Text, out var result8))
											{
												ushort num5 = (ushort)result8;
												<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)ptr2, &num5);
											}
										}
									}
								}
							}
						}
					}
				}
			}
			System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<Cutscene_Registy,std::allocator<Cutscene_Registy> > obj4);
			vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >* ptr8 = &obj4;
			vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >* cutsceneVector = <Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{ctor}(&obj4, &obj);
			<Module>.WriteAllCutsceneRegistryDataToFile(cutsceneVector);
			btn_LoadIDList_Click(null, null);
			loggerBox.Text = "Saved changes to the selected cutscene";
			loggerBox.Refresh();
			System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj5);
			basic_string<char,std::char_traits<char>,std::allocator<char> >* pThis = &obj5;
			basic_string<char,std::char_traits<char>,std::allocator<char> >* bakeName = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj5, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
			basic_string<char,std::char_traits<char>,std::allocator<char> >* folderInTributeToBake;
			try
			{
				System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj6);
				basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr9 = &obj6;
				folderInTributeToBake = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), pThis);
				throw;
			}
			<Module>.TellCakeviewToBake(folderInTributeToBake, bakeName);
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >*, void>)(&<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{dtor}), &obj);
			throw;
		}
		<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >._Tidy(&obj);
		GC.KeepAlive(this);
		return;
		IL_007c:
		<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >._Tidy(&obj);
	}

	private unsafe void btn_SaveAsNew_Click(object sender, EventArgs e)
	{
		System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<Cutscene_Registy,std::allocator<Cutscene_Registy> > obj);
		<Module>.GetAllCutsceneRegistry(&obj);
		System.Runtime.CompilerServices.Unsafe.SkipInit(out Cutscene_Registy cutscene_Registy);
		try
		{
			<Module>.Cutscene_Registy.{ctor}(&cutscene_Registy);
			try
			{
				if (input_cutsceneID.Text.Length == 0)
				{
					MessageBox.Show("Cutscene ID cannot be empty.", "Error", MessageBoxButtons.OK, MessageBoxIcon.Hand);
					GC.KeepAlive(this);
					goto IL_004d;
				}
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<Cutscene_Registy*, void>)(&<Module>.Cutscene_Registy.{dtor}), &cutscene_Registy);
				throw;
			}
			goto end_IL_0008;
			IL_004d:
			<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Tidy((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)));
			goto IL_0067;
			end_IL_0008:;
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >*, void>)(&<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{dtor}), &obj);
			throw;
		}
		try
		{
			try
			{
				if (uint.TryParse(input_cutsceneID.Text, out var result))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj2);
					*(uint*)(&obj2) = result;
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj2, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(ref cutscene_Registy, ref obj2, 8);
				}
				if (uint.TryParse(input_NameSDBID.Text, out var result2))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj3);
					*(uint*)(&obj3) = result2;
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj3, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 8), ref obj3, 8);
				}
				if (cbType.SelectedIndex != -1)
				{
					int selectedIndex = cbType.SelectedIndex;
					<Module>.std.optional<unsigned char>.operator=<int,0>((optional<unsigned char>*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 18)), &selectedIndex);
				}
				if (input_numCharacters.Text.Length > 0)
				{
					if (uint.TryParse(input_numCharacters.Text, out var result3))
					{
						if (result3 < 2)
						{
							System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 17)) = 0;
						}
						else
						{
							<Module>.std._Optional_construct_base<unsigned char>._Assign<unsigned int &>((_Optional_construct_base<unsigned char>*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 16)), &result3);
						}
					}
					else
					{
						System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 17)) = 0;
					}
				}
				else
				{
					System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 17)) = 0;
				}
				<Module>.std.vector<unsigned short,std::allocator<unsigned short> >.clear((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)));
				if (input_defaultChar1.Text.Length > 0 && uint.TryParse(input_defaultChar1.Text, out var result4))
				{
					ushort num = (ushort)result4;
					<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)), &num);
				}
				if (input_defaultChar2.Text.Length > 0 && System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 32)) - System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) >> 1 != 0 && uint.TryParse(input_defaultChar2.Text, out var result5))
				{
					ushort num2 = (ushort)result5;
					<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)), &num2);
				}
				if (input_defaultChar3.Text.Length > 0 && (ulong)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 32)) - System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) >> 1) > 1uL && uint.TryParse(input_defaultChar3.Text, out var result6))
				{
					ushort num3 = (ushort)result6;
					<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)), &num3);
				}
				if (input_defaultChar4.Text.Length > 0 && (ulong)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 32)) - System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) >> 1) > 2uL && uint.TryParse(input_defaultChar4.Text, out var result7))
				{
					ushort num4 = (ushort)result7;
					<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)), &num4);
				}
				if (input_defaultChar5.Text.Length > 0 && (ulong)(System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 32)) - System.Runtime.CompilerServices.Unsafe.As<Cutscene_Registy, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)) >> 1) > 3uL && uint.TryParse(input_defaultChar5.Text, out var result8))
				{
					ushort num5 = (ushort)result8;
					<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Emplace_one_at_back<unsigned short>((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)), &num5);
				}
				int num6 = 0;
				<Module>.std.optional<unsigned char>.operator=<int,0>((optional<unsigned char>*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 48)), &num6);
				int num7 = 65535;
				<Module>.std.optional<unsigned short>.operator=<int,0>((optional<unsigned short>*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 50)), &num7);
				long num8 = 6686333493800924204L;
				<Module>.std.optional<unsigned __int64>.operator=<__int64,0>((optional<unsigned __int64>*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 56)), &num8);
				uint num9 = uint.MaxValue;
				<Module>.std.optional<unsigned int>.operator=<unsigned long,0>((optional<unsigned int>*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 72)), &num9);
				<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >._Emplace_one_at_back<struct Cutscene_Registy const &>(&obj, &cutscene_Registy);
				System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<Cutscene_Registy,std::allocator<Cutscene_Registy> > obj4);
				vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >* ptr = &obj4;
				vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >* cutsceneVector = <Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{ctor}(&obj4, &obj);
				<Module>.WriteAllCutsceneRegistryDataToFile(cutsceneVector);
				btn_LoadIDList_Click(null, null);
				loggerBox.Text = "Saved new cutscene to the list";
				loggerBox.Refresh();
				System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj5);
				basic_string<char,std::char_traits<char>,std::allocator<char> >* pThis = &obj5;
				basic_string<char,std::char_traits<char>,std::allocator<char> >* bakeName = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj5, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
				basic_string<char,std::char_traits<char>,std::allocator<char> >* folderInTributeToBake;
				try
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj6);
					basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr2 = &obj6;
					folderInTributeToBake = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
				}
				catch
				{
					//try-fault
					<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), pThis);
					throw;
				}
				<Module>.TellCakeviewToBake(folderInTributeToBake, bakeName);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<Cutscene_Registy*, void>)(&<Module>.Cutscene_Registy.{dtor}), &cutscene_Registy);
				throw;
			}
			<Module>.std.vector<unsigned short,std::allocator<unsigned short> >._Tidy((vector<unsigned short,std::allocator<unsigned short> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Registy, 24)));
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >*, void>)(&<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >.{dtor}), &obj);
			throw;
		}
		<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >._Tidy(&obj);
		GC.KeepAlive(this);
		return;
		IL_0067:
		<Module>.std.vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >._Tidy(&obj);
	}

	private unsafe void btn_SDB_Click(object sender, EventArgs e)
	{
		uint num = 0u;
		CreateSDBEntry createSDBEntry = new CreateSDBEntry();
		if (createSDBEntry.ShowDialog() == DialogResult.OK)
		{
			uint returnValue = createSDBEntry.ReturnValue;
			TextBox textBox = input_NameSDBID;
			System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj);
			basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj = <Module>.std.to_string(&obj, returnValue);
			try
			{
				string text = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj);
				textBox.Text = text;
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
		GC.KeepAlive(this);
	}

	[HandleProcessCorruptedStateExceptions]
	protected override void Dispose([MarshalAs(UnmanagedType.U1)] bool A_0)
	{
		if (A_0)
		{
			try
			{
				~CutsceneIDList();
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
