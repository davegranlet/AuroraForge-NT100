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

public class CutsceneEditor : Form
{
	private Label loggerBox;

	private Label label4;

	private TextBox input_searchBox;

	private Label label18;

	private Button btn_LoadCharMaps;

	private ListBox list_profiles;

	private Label label11;

	private TextBox input_animID;

	private Button btn_CreateEntrance;

	private Label label1;

	private TextBox input_wrestlerID1;

	private Label label2;

	private TextBox input_wrestlerID2;

	private Label label3;

	private TextBox input_wrestlerID3;

	private Label label5;

	private TextBox input_wrestlerID4;

	private Button btn_removeSelected;

	private ComboBox cb_Category;

	private Label label6;

	private Button btn_AnimIDList;

	private Button btn_ViewRosterList;

	private CheckBox cb_SetForTitleEntrance;

	private Container components;

	public CutsceneEditor()
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

	private void ~CutsceneEditor()
	{
		((IDisposable)components)?.Dispose();
		GC.KeepAlive(this);
	}

	private void InitializeComponent()
	{
		System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(TRIBUTE26.CutsceneEditor));
		this.loggerBox = new System.Windows.Forms.Label();
		this.label4 = new System.Windows.Forms.Label();
		this.input_searchBox = new System.Windows.Forms.TextBox();
		this.label18 = new System.Windows.Forms.Label();
		this.btn_LoadCharMaps = new System.Windows.Forms.Button();
		this.list_profiles = new System.Windows.Forms.ListBox();
		this.label11 = new System.Windows.Forms.Label();
		this.input_animID = new System.Windows.Forms.TextBox();
		this.btn_CreateEntrance = new System.Windows.Forms.Button();
		this.label1 = new System.Windows.Forms.Label();
		this.input_wrestlerID1 = new System.Windows.Forms.TextBox();
		this.label2 = new System.Windows.Forms.Label();
		this.input_wrestlerID2 = new System.Windows.Forms.TextBox();
		this.label3 = new System.Windows.Forms.Label();
		this.input_wrestlerID3 = new System.Windows.Forms.TextBox();
		this.label5 = new System.Windows.Forms.Label();
		this.input_wrestlerID4 = new System.Windows.Forms.TextBox();
		this.btn_removeSelected = new System.Windows.Forms.Button();
		this.cb_Category = new System.Windows.Forms.ComboBox();
		this.label6 = new System.Windows.Forms.Label();
		this.btn_AnimIDList = new System.Windows.Forms.Button();
		this.btn_ViewRosterList = new System.Windows.Forms.Button();
		this.cb_SetForTitleEntrance = new System.Windows.Forms.CheckBox();
		base.SuspendLayout();
		System.Windows.Forms.Label label = this.loggerBox;
		System.Drawing.Color backColor = System.Drawing.Color.FromArgb(40, 40, 40);
		label.BackColor = backColor;
		this.loggerBox.Dock = System.Windows.Forms.DockStyle.Bottom;
		System.Windows.Forms.Label label2 = this.loggerBox;
		System.Drawing.Font font = new System.Drawing.Font("Microsoft Sans Serif", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label2.Font = font;
		System.Windows.Forms.Label label3 = this.loggerBox;
		System.Drawing.Color control = System.Drawing.SystemColors.Control;
		label3.ForeColor = control;
		System.Windows.Forms.Label label4 = this.loggerBox;
		System.Drawing.Point location = new System.Drawing.Point(0, 866);
		label4.Location = location;
		this.loggerBox.Name = "loggerBox";
		System.Windows.Forms.Label label5 = this.loggerBox;
		System.Windows.Forms.Padding padding = new System.Windows.Forms.Padding(0, 5, 0, 5);
		label5.Padding = padding;
		System.Windows.Forms.Label label6 = this.loggerBox;
		System.Drawing.Size size = new System.Drawing.Size(1044, 37);
		label6.Size = size;
		this.loggerBox.TabIndex = 485;
		this.loggerBox.Text = "Entrance Overrides";
		this.label4.AutoSize = true;
		System.Windows.Forms.Label label7 = this.label4;
		System.Drawing.Font font2 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label7.Font = font2;
		System.Windows.Forms.Label label8 = this.label4;
		System.Drawing.Color controlLightLight = System.Drawing.SystemColors.ControlLightLight;
		label8.ForeColor = controlLightLight;
		System.Windows.Forms.Label label9 = this.label4;
		System.Drawing.Point location2 = new System.Drawing.Point(24, 132);
		label9.Location = location2;
		this.label4.Name = "label4";
		System.Windows.Forms.Label label10 = this.label4;
		System.Drawing.Size size2 = new System.Drawing.Size(78, 22);
		label10.Size = size2;
		this.label4.TabIndex = 484;
		this.label4.Text = "Search:";
		System.Windows.Forms.TextBox textBox = this.input_searchBox;
		System.Drawing.Font font3 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox.Font = font3;
		System.Windows.Forms.TextBox textBox2 = this.input_searchBox;
		System.Drawing.Point location3 = new System.Drawing.Point(118, 129);
		textBox2.Location = location3;
		this.input_searchBox.Name = "input_searchBox";
		System.Windows.Forms.TextBox textBox3 = this.input_searchBox;
		System.Drawing.Size size3 = new System.Drawing.Size(898, 29);
		textBox3.Size = size3;
		this.input_searchBox.TabIndex = 483;
		System.Windows.Forms.TextBox textBox4 = this.input_searchBox;
		System.EventHandler value = new System.EventHandler(this.input_searchBox_TextChanged);
		textBox4.TextChanged += value;
		this.label18.AutoSize = true;
		System.Windows.Forms.Label label11 = this.label18;
		System.Drawing.Font font4 = new System.Drawing.Font("Rockwell Extra Bold", 13.8f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		label11.Font = font4;
		System.Windows.Forms.Label label12 = this.label18;
		System.Drawing.Color steelBlue = System.Drawing.Color.SteelBlue;
		label12.ForeColor = steelBlue;
		System.Windows.Forms.Label label13 = this.label18;
		System.Drawing.Point location4 = new System.Drawing.Point(22, 21);
		label13.Location = location4;
		this.label18.Name = "label18";
		System.Windows.Forms.Label label14 = this.label18;
		System.Drawing.Size size4 = new System.Drawing.Size(494, 27);
		label14.Size = size4;
		this.label18.TabIndex = 482;
		this.label18.Text = "Entrance / Victory Motion Overrides";
		System.Windows.Forms.Button button = this.btn_LoadCharMaps;
		System.Drawing.Color backColor2 = System.Drawing.Color.FromArgb(40, 40, 40);
		button.BackColor = backColor2;
		this.btn_LoadCharMaps.FlatAppearance.BorderSize = 0;
		this.btn_LoadCharMaps.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button2 = this.btn_LoadCharMaps;
		System.Drawing.Font font5 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button2.Font = font5;
		System.Windows.Forms.Button button3 = this.btn_LoadCharMaps;
		System.Drawing.Color control2 = System.Drawing.SystemColors.Control;
		button3.ForeColor = control2;
		System.Windows.Forms.Button button4 = this.btn_LoadCharMaps;
		System.Drawing.Point location5 = new System.Drawing.Point(27, 65);
		button4.Location = location5;
		this.btn_LoadCharMaps.Name = "btn_LoadCharMaps";
		System.Windows.Forms.Button button5 = this.btn_LoadCharMaps;
		System.Drawing.Size size5 = new System.Drawing.Size(989, 39);
		button5.Size = size5;
		this.btn_LoadCharMaps.TabIndex = 481;
		this.btn_LoadCharMaps.Text = "LOAD CUTSCENE DATA";
		this.btn_LoadCharMaps.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button6 = this.btn_LoadCharMaps;
		System.EventHandler value2 = new System.EventHandler(this.btn_LoadCharMaps_Click);
		button6.Click += value2;
		System.Windows.Forms.ListBox listBox = this.list_profiles;
		System.Drawing.Color backColor3 = System.Drawing.Color.FromArgb(60, 60, 60);
		listBox.BackColor = backColor3;
		System.Windows.Forms.ListBox listBox2 = this.list_profiles;
		System.Drawing.Font font6 = new System.Drawing.Font("Rockwell", 10.8f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		listBox2.Font = font6;
		System.Windows.Forms.ListBox listBox3 = this.list_profiles;
		System.Drawing.Color control3 = System.Drawing.SystemColors.Control;
		listBox3.ForeColor = control3;
		this.list_profiles.FormattingEnabled = true;
		this.list_profiles.HorizontalScrollbar = true;
		this.list_profiles.ItemHeight = 20;
		System.Windows.Forms.ListBox listBox4 = this.list_profiles;
		System.Drawing.Point location6 = new System.Drawing.Point(27, 164);
		listBox4.Location = location6;
		this.list_profiles.Name = "list_profiles";
		this.list_profiles.ScrollAlwaysVisible = true;
		System.Windows.Forms.ListBox listBox5 = this.list_profiles;
		System.Drawing.Size size6 = new System.Drawing.Size(989, 384);
		listBox5.Size = size6;
		this.list_profiles.TabIndex = 480;
		this.label11.AutoSize = true;
		System.Windows.Forms.Label label15 = this.label11;
		System.Drawing.Font font7 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label15.Font = font7;
		System.Windows.Forms.Label label16 = this.label11;
		System.Drawing.Color controlLightLight2 = System.Drawing.SystemColors.ControlLightLight;
		label16.ForeColor = controlLightLight2;
		System.Windows.Forms.Label label17 = this.label11;
		System.Drawing.Point location7 = new System.Drawing.Point(25, 683);
		label17.Location = location7;
		this.label11.Name = "label11";
		System.Windows.Forms.Label label18 = this.label11;
		System.Drawing.Size size7 = new System.Drawing.Size(84, 22);
		label18.Size = size7;
		this.label11.TabIndex = 493;
		this.label11.Text = "Anim ID";
		System.Windows.Forms.TextBox textBox5 = this.input_animID;
		System.Drawing.Color backColor4 = System.Drawing.SystemColors.Window;
		textBox5.BackColor = backColor4;
		System.Windows.Forms.TextBox textBox6 = this.input_animID;
		System.Drawing.Font font8 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox6.Font = font8;
		System.Windows.Forms.TextBox textBox7 = this.input_animID;
		System.Drawing.Point location8 = new System.Drawing.Point(192, 680);
		textBox7.Location = location8;
		this.input_animID.Name = "input_animID";
		System.Windows.Forms.TextBox textBox8 = this.input_animID;
		System.Drawing.Size size8 = new System.Drawing.Size(180, 29);
		textBox8.Size = size8;
		this.input_animID.TabIndex = 494;
		System.Windows.Forms.Button button7 = this.btn_CreateEntrance;
		System.Drawing.Color backColor5 = System.Drawing.Color.FromArgb(40, 40, 40);
		button7.BackColor = backColor5;
		this.btn_CreateEntrance.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button8 = this.btn_CreateEntrance;
		System.Drawing.Font font9 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button8.Font = font9;
		System.Windows.Forms.Button button9 = this.btn_CreateEntrance;
		System.Drawing.Color control4 = System.Drawing.SystemColors.Control;
		button9.ForeColor = control4;
		System.Windows.Forms.Button button10 = this.btn_CreateEntrance;
		System.Drawing.Point location9 = new System.Drawing.Point(27, 804);
		button10.Location = location9;
		this.btn_CreateEntrance.Name = "btn_CreateEntrance";
		System.Windows.Forms.Button button11 = this.btn_CreateEntrance;
		System.Drawing.Size size9 = new System.Drawing.Size(989, 39);
		button11.Size = size9;
		this.btn_CreateEntrance.TabIndex = 492;
		this.btn_CreateEntrance.Text = "ADD CUTSCENE DATA";
		this.btn_CreateEntrance.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button12 = this.btn_CreateEntrance;
		System.EventHandler value3 = new System.EventHandler(this.btn_CreateEntrance_Click);
		button12.Click += value3;
		this.label1.AutoSize = true;
		System.Windows.Forms.Label label19 = this.label1;
		System.Drawing.Font font10 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label19.Font = font10;
		System.Windows.Forms.Label label20 = this.label1;
		System.Drawing.Color controlLightLight3 = System.Drawing.SystemColors.ControlLightLight;
		label20.ForeColor = controlLightLight3;
		System.Windows.Forms.Label label21 = this.label1;
		System.Drawing.Point location10 = new System.Drawing.Point(24, 718);
		label21.Location = location10;
		this.label1.Name = "label1";
		System.Windows.Forms.Label label22 = this.label1;
		System.Drawing.Size size10 = new System.Drawing.Size(131, 22);
		label22.Size = size10;
		this.label1.TabIndex = 496;
		this.label1.Text = "Wrestler 1 ID";
		System.Windows.Forms.TextBox textBox9 = this.input_wrestlerID1;
		System.Drawing.Color backColor6 = System.Drawing.SystemColors.Window;
		textBox9.BackColor = backColor6;
		System.Windows.Forms.TextBox textBox10 = this.input_wrestlerID1;
		System.Drawing.Font font11 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox10.Font = font11;
		System.Windows.Forms.TextBox textBox11 = this.input_wrestlerID1;
		System.Drawing.Point location11 = new System.Drawing.Point(192, 715);
		textBox11.Location = location11;
		this.input_wrestlerID1.Name = "input_wrestlerID1";
		System.Windows.Forms.TextBox textBox12 = this.input_wrestlerID1;
		System.Drawing.Size size11 = new System.Drawing.Size(180, 29);
		textBox12.Size = size11;
		this.input_wrestlerID1.TabIndex = 497;
		this.label2.AutoSize = true;
		System.Windows.Forms.Label label23 = this.label2;
		System.Drawing.Font font12 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label23.Font = font12;
		System.Windows.Forms.Label label24 = this.label2;
		System.Drawing.Color controlLightLight4 = System.Drawing.SystemColors.ControlLightLight;
		label24.ForeColor = controlLightLight4;
		System.Windows.Forms.Label label25 = this.label2;
		System.Drawing.Point location12 = new System.Drawing.Point(25, 753);
		label25.Location = location12;
		this.label2.Name = "label2";
		System.Windows.Forms.Label label26 = this.label2;
		System.Drawing.Size size12 = new System.Drawing.Size(131, 22);
		label26.Size = size12;
		this.label2.TabIndex = 498;
		this.label2.Text = "Wrestler 2 ID";
		System.Windows.Forms.TextBox textBox13 = this.input_wrestlerID2;
		System.Drawing.Color backColor7 = System.Drawing.SystemColors.Window;
		textBox13.BackColor = backColor7;
		System.Windows.Forms.TextBox textBox14 = this.input_wrestlerID2;
		System.Drawing.Font font13 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox14.Font = font13;
		System.Windows.Forms.TextBox textBox15 = this.input_wrestlerID2;
		System.Drawing.Point location13 = new System.Drawing.Point(192, 750);
		textBox15.Location = location13;
		this.input_wrestlerID2.Name = "input_wrestlerID2";
		System.Windows.Forms.TextBox textBox16 = this.input_wrestlerID2;
		System.Drawing.Size size13 = new System.Drawing.Size(180, 29);
		textBox16.Size = size13;
		this.input_wrestlerID2.TabIndex = 499;
		this.label3.AutoSize = true;
		System.Windows.Forms.Label label27 = this.label3;
		System.Drawing.Font font14 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label27.Font = font14;
		System.Windows.Forms.Label label28 = this.label3;
		System.Drawing.Color controlLightLight5 = System.Drawing.SystemColors.ControlLightLight;
		label28.ForeColor = controlLightLight5;
		System.Windows.Forms.Label label29 = this.label3;
		System.Drawing.Point location14 = new System.Drawing.Point(407, 718);
		label29.Location = location14;
		this.label3.Name = "label3";
		System.Windows.Forms.Label label30 = this.label3;
		System.Drawing.Size size14 = new System.Drawing.Size(131, 22);
		label30.Size = size14;
		this.label3.TabIndex = 500;
		this.label3.Text = "Wrestler 3 ID";
		System.Windows.Forms.TextBox textBox17 = this.input_wrestlerID3;
		System.Drawing.Color backColor8 = System.Drawing.SystemColors.Window;
		textBox17.BackColor = backColor8;
		System.Windows.Forms.TextBox textBox18 = this.input_wrestlerID3;
		System.Drawing.Font font15 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox18.Font = font15;
		System.Windows.Forms.TextBox textBox19 = this.input_wrestlerID3;
		System.Drawing.Point location15 = new System.Drawing.Point(574, 715);
		textBox19.Location = location15;
		this.input_wrestlerID3.Name = "input_wrestlerID3";
		System.Windows.Forms.TextBox textBox20 = this.input_wrestlerID3;
		System.Drawing.Size size15 = new System.Drawing.Size(180, 29);
		textBox20.Size = size15;
		this.input_wrestlerID3.TabIndex = 501;
		this.label5.AutoSize = true;
		System.Windows.Forms.Label label31 = this.label5;
		System.Drawing.Font font16 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label31.Font = font16;
		System.Windows.Forms.Label label32 = this.label5;
		System.Drawing.Color controlLightLight6 = System.Drawing.SystemColors.ControlLightLight;
		label32.ForeColor = controlLightLight6;
		System.Windows.Forms.Label label33 = this.label5;
		System.Drawing.Point location16 = new System.Drawing.Point(407, 753);
		label33.Location = location16;
		this.label5.Name = "label5";
		System.Windows.Forms.Label label34 = this.label5;
		System.Drawing.Size size16 = new System.Drawing.Size(131, 22);
		label34.Size = size16;
		this.label5.TabIndex = 502;
		this.label5.Text = "Wrestler 4 ID";
		System.Windows.Forms.TextBox textBox21 = this.input_wrestlerID4;
		System.Drawing.Color backColor9 = System.Drawing.SystemColors.Window;
		textBox21.BackColor = backColor9;
		System.Windows.Forms.TextBox textBox22 = this.input_wrestlerID4;
		System.Drawing.Font font17 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox22.Font = font17;
		System.Windows.Forms.TextBox textBox23 = this.input_wrestlerID4;
		System.Drawing.Point location17 = new System.Drawing.Point(574, 750);
		textBox23.Location = location17;
		this.input_wrestlerID4.Name = "input_wrestlerID4";
		System.Windows.Forms.TextBox textBox24 = this.input_wrestlerID4;
		System.Drawing.Size size17 = new System.Drawing.Size(180, 29);
		textBox24.Size = size17;
		this.input_wrestlerID4.TabIndex = 503;
		System.Windows.Forms.Button button13 = this.btn_removeSelected;
		System.Drawing.Color backColor10 = System.Drawing.Color.FromArgb(40, 40, 40);
		button13.BackColor = backColor10;
		this.btn_removeSelected.FlatAppearance.BorderSize = 0;
		this.btn_removeSelected.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button14 = this.btn_removeSelected;
		System.Drawing.Font font18 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button14.Font = font18;
		System.Windows.Forms.Button button15 = this.btn_removeSelected;
		System.Drawing.Color control5 = System.Drawing.SystemColors.Control;
		button15.ForeColor = control5;
		System.Windows.Forms.Button button16 = this.btn_removeSelected;
		System.Drawing.Point location18 = new System.Drawing.Point(28, 554);
		button16.Location = location18;
		this.btn_removeSelected.Name = "btn_removeSelected";
		System.Windows.Forms.Button button17 = this.btn_removeSelected;
		System.Drawing.Size size18 = new System.Drawing.Size(988, 39);
		button17.Size = size18;
		this.btn_removeSelected.TabIndex = 504;
		this.btn_removeSelected.Text = "REMOVE SELECTED";
		this.btn_removeSelected.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button18 = this.btn_removeSelected;
		System.EventHandler value4 = new System.EventHandler(this.btn_removeSelected_Click);
		button18.Click += value4;
		System.Windows.Forms.ComboBox comboBox = this.cb_Category;
		System.Drawing.Font font19 = new System.Drawing.Font("Microsoft YaHei", 10f);
		comboBox.Font = font19;
		this.cb_Category.FormattingEnabled = true;
		object[] items = new object[10] { "Entrance Override", "Entrance With Manager", "Tag Team Entrance", "Victory With Manager", "3-Man Entrance", "4-Man Entrance", "3-Man Roman Title Entrance", "4-Man Roman Title Entrance", "Roman Title Entrance With Manager", "Roman Title Victory With Manager" };
		this.cb_Category.Items.AddRange(items);
		System.Windows.Forms.ComboBox comboBox2 = this.cb_Category;
		System.Drawing.Point location19 = new System.Drawing.Point(192, 622);
		comboBox2.Location = location19;
		this.cb_Category.Name = "cb_Category";
		System.Windows.Forms.ComboBox comboBox3 = this.cb_Category;
		System.Drawing.Size size19 = new System.Drawing.Size(562, 31);
		comboBox3.Size = size19;
		this.cb_Category.TabIndex = 505;
		System.Windows.Forms.ComboBox comboBox4 = this.cb_Category;
		System.EventHandler value5 = new System.EventHandler(this.cb_Category_SelectedIndexChanged);
		comboBox4.SelectedIndexChanged += value5;
		this.label6.AutoSize = true;
		System.Windows.Forms.Label label35 = this.label6;
		System.Drawing.Font font20 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label35.Font = font20;
		System.Windows.Forms.Label label36 = this.label6;
		System.Drawing.Color controlLightLight7 = System.Drawing.SystemColors.ControlLightLight;
		label36.ForeColor = controlLightLight7;
		System.Windows.Forms.Label label37 = this.label6;
		System.Drawing.Point location20 = new System.Drawing.Point(25, 625);
		label37.Location = location20;
		this.label6.Name = "label6";
		System.Windows.Forms.Label label38 = this.label6;
		System.Drawing.Size size20 = new System.Drawing.Size(96, 22);
		label38.Size = size20;
		this.label6.TabIndex = 506;
		this.label6.Text = "Category";
		System.Windows.Forms.Button button19 = this.btn_AnimIDList;
		System.Drawing.Color steelBlue2 = System.Drawing.Color.SteelBlue;
		button19.BackColor = steelBlue2;
		this.btn_AnimIDList.FlatAppearance.BorderSize = 0;
		this.btn_AnimIDList.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button20 = this.btn_AnimIDList;
		System.Drawing.Font font21 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button20.Font = font21;
		System.Windows.Forms.Button button21 = this.btn_AnimIDList;
		System.Drawing.Color control6 = System.Drawing.SystemColors.Control;
		button21.ForeColor = control6;
		System.Windows.Forms.Button button22 = this.btn_AnimIDList;
		System.Drawing.Point location21 = new System.Drawing.Point(378, 680);
		button22.Location = location21;
		this.btn_AnimIDList.Name = "btn_AnimIDList";
		System.Windows.Forms.Button button23 = this.btn_AnimIDList;
		System.Drawing.Size size21 = new System.Drawing.Size(203, 29);
		button23.Size = size21;
		this.btn_AnimIDList.TabIndex = 507;
		this.btn_AnimIDList.Text = "ANIM ID LIST";
		this.btn_AnimIDList.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button24 = this.btn_AnimIDList;
		System.EventHandler value6 = new System.EventHandler(this.btn_AnimIDList_Click);
		button24.Click += value6;
		System.Windows.Forms.Button button25 = this.btn_ViewRosterList;
		System.Drawing.Color goldenrod = System.Drawing.Color.Goldenrod;
		button25.BackColor = goldenrod;
		this.btn_ViewRosterList.FlatAppearance.BorderSize = 0;
		this.btn_ViewRosterList.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button26 = this.btn_ViewRosterList;
		System.Drawing.Font font22 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button26.Font = font22;
		System.Windows.Forms.Button button27 = this.btn_ViewRosterList;
		System.Drawing.Color control7 = System.Drawing.SystemColors.Control;
		button27.ForeColor = control7;
		System.Windows.Forms.Button button28 = this.btn_ViewRosterList;
		System.Drawing.Point location22 = new System.Drawing.Point(760, 715);
		button28.Location = location22;
		this.btn_ViewRosterList.Name = "btn_ViewRosterList";
		System.Windows.Forms.Button button29 = this.btn_ViewRosterList;
		System.Drawing.Size size22 = new System.Drawing.Size(203, 29);
		button29.Size = size22;
		this.btn_ViewRosterList.TabIndex = 668;
		this.btn_ViewRosterList.Text = "ROSTER LIST";
		this.btn_ViewRosterList.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button30 = this.btn_ViewRosterList;
		System.EventHandler value7 = new System.EventHandler(this.btn_ViewRosterList_Click);
		button30.Click += value7;
		this.cb_SetForTitleEntrance.AutoSize = true;
		System.Windows.Forms.CheckBox checkBox = this.cb_SetForTitleEntrance;
		System.Drawing.Font font23 = new System.Drawing.Font("Rockwell", 12f);
		checkBox.Font = font23;
		System.Windows.Forms.CheckBox checkBox2 = this.cb_SetForTitleEntrance;
		System.Drawing.Color controlLightLight8 = System.Drawing.SystemColors.ControlLightLight;
		checkBox2.ForeColor = controlLightLight8;
		System.Windows.Forms.CheckBox checkBox3 = this.cb_SetForTitleEntrance;
		System.Drawing.Point location23 = new System.Drawing.Point(601, 681);
		checkBox3.Location = location23;
		this.cb_SetForTitleEntrance.Name = "cb_SetForTitleEntrance";
		System.Windows.Forms.CheckBox checkBox4 = this.cb_SetForTitleEntrance;
		System.Drawing.Size size23 = new System.Drawing.Size(226, 26);
		checkBox4.Size = size23;
		this.cb_SetForTitleEntrance.TabIndex = 669;
		this.cb_SetForTitleEntrance.Text = "Set For Title Entrance";
		this.cb_SetForTitleEntrance.UseVisualStyleBackColor = true;
		System.Drawing.SizeF sizeF = new System.Drawing.SizeF(8f, 16f);
		base.AutoScaleDimensions = sizeF;
		base.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
		System.Drawing.Color backColor11 = System.Drawing.Color.FromArgb(20, 20, 20);
		this.BackColor = backColor11;
		System.Drawing.Size clientSize = new System.Drawing.Size(1044, 903);
		base.ClientSize = clientSize;
		base.Controls.Add(this.cb_SetForTitleEntrance);
		base.Controls.Add(this.btn_ViewRosterList);
		base.Controls.Add(this.btn_AnimIDList);
		base.Controls.Add(this.label6);
		base.Controls.Add(this.cb_Category);
		base.Controls.Add(this.btn_removeSelected);
		base.Controls.Add(this.label5);
		base.Controls.Add(this.input_wrestlerID4);
		base.Controls.Add(this.label3);
		base.Controls.Add(this.input_wrestlerID3);
		base.Controls.Add(this.label2);
		base.Controls.Add(this.input_wrestlerID2);
		base.Controls.Add(this.label1);
		base.Controls.Add(this.input_wrestlerID1);
		base.Controls.Add(this.label11);
		base.Controls.Add(this.input_animID);
		base.Controls.Add(this.btn_CreateEntrance);
		base.Controls.Add(this.loggerBox);
		base.Controls.Add(this.label4);
		base.Controls.Add(this.input_searchBox);
		base.Controls.Add(this.label18);
		base.Controls.Add(this.btn_LoadCharMaps);
		base.Controls.Add(this.list_profiles);
		base.Icon = (System.Drawing.Icon)resources.GetObject("$this.Icon");
		System.Drawing.Size minimumSize = new System.Drawing.Size(1062, 950);
		this.MinimumSize = minimumSize;
		base.Name = "CutsceneEditor";
		base.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
		this.Text = "Entrance Overrides";
		base.ResumeLayout(false);
		base.PerformLayout();
	}

	private unsafe void btn_LoadCharMaps_Click(object sender, EventArgs e)
	{
		//IL_0086: Expected I, but got I8
		//IL_082a: Expected I, but got I8
		//IL_0126: Expected I, but got I8
		//IL_0244: Expected I, but got I8
		//IL_0248: Expected I, but got I8
		//IL_0250: Expected I, but got I8
		//IL_02dd: Expected I, but got I8
		//IL_0467: Expected I, but got I8
		marshal_context marshal_context2 = null;
		string text = null;
		uint num = 0u;
		<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >.clear((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A));
		<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
		<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
		input_animID.Text = "";
		input_wrestlerID1.Text = "";
		input_wrestlerID2.Text = "";
		input_wrestlerID3.Text = "";
		input_wrestlerID4.Text = "";
		cb_Category.SelectedIndex = -1;
		void* sdb = null;
		<Module>.GetSDB(&sdb);
		if (!<Module>.isSDBPresent(sdb))
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
				System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<CutsceneData,std::allocator<CutsceneData> > obj2);
				<Module>.GetAllCutsceneCastData(&obj2);
				try
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<CharProfileParameters,std::allocator<CharProfileParameters> > obj3);
					<Module>.FB_GetAllProfiles(&obj3);
					try
					{
						list_profiles.Items.Clear();
						int num2 = 0;
						if (0uL < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<CutsceneData,std::allocator<CutsceneData> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj2, 8)) - *(long*)(&obj2) >> 7))
						{
							long num3 = 0L;
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj4);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj5);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj6);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj7);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj8);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out Cutscene_Wrestler cutscene_Wrestler);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out CharProfileParameters charProfileParameters);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj9);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj10);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj11);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj12);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj13);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj14);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj15);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj16);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj17);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj18);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj19);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj20);
							do
							{
								long num4 = *(long*)(&obj2) + num3;
								optional<unsigned int>* ptr = (optional<unsigned int>*)num4;
								uint num5;
								uint val;
								uint num6;
								if (*(byte*)((ulong)(nint)ptr + 4uL) != 0)
								{
									num5 = *(uint*)ptr;
									if (*(byte*)(num4 + 8 + 1) != 0)
									{
										val = *(byte*)(num4 + 8);
										num6 = 0u;
										int num7 = 0;
										ulong num8 = (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<Cutscene_Registy,std::allocator<Cutscene_Registy> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj, 8)) - *(long*)(&obj)) / 80);
										if (0 >= num8)
										{
											goto IL_01a6;
										}
										long num9 = *(long*)(&obj) + 4;
										while (true)
										{
											if (*(byte*)num9 != 0 && *(int*)(num9 - 4) == (int)num5)
											{
												if (*(byte*)(num9 + 8) == 0)
												{
													break;
												}
												num6 = *(uint*)(num9 + 4);
											}
											num7++;
											num9 += 80;
											if ((ulong)num7 < num8)
											{
												continue;
											}
											goto IL_01a6;
										}
										<Module>.std._Throw_bad_optional_access();
										goto IL_0725;
									}
									goto IL_076a;
								}
								goto IL_076f;
								IL_01a6:
								<Module>.std.to_string(&obj4, num5);
								try
								{
									<Module>.std.to_string(&obj5, val);
									try
									{
										<Module>.std._String_val<std::_Simple_types<char> >.{ctor}((_String_val<std::_Simple_types<char> >*)(&obj6));
										try
										{
											<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Construct_empty(&obj6);
										}
										catch
										{
											//try-fault
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj6);
											throw;
										}
										try
										{
											if (num6 != 0)
											{
												basic_string<char,std::char_traits<char>,std::allocator<char> >* stringFromSDB = <Module>.GetStringFromSDB(&obj7, sdb, num6);
												try
												{
													<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.=(&obj6, stringFromSDB);
												}
												catch
												{
													//try-fault
													<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj7);
													throw;
												}
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
											}
											else
											{
												<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.=(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0M@FEICBPOG@NO?5SDB?5NAME@));
											}
											<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj8, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_00CNPNBAHC@@));
											try
											{
												vector<Cutscene_Wrestler,std::allocator<Cutscene_Wrestler> >* ptr2 = (vector<Cutscene_Wrestler,std::allocator<Cutscene_Wrestler> >*)(num3 + *(long*)(&obj2) + 40);
												Cutscene_Wrestler* ptr3 = (Cutscene_Wrestler*)(*(ulong*)ptr2);
												Cutscene_Wrestler* ptr4 = (Cutscene_Wrestler*)(*(ulong*)((ulong)(nint)ptr2 + 8uL));
												if (ptr3 == ptr4)
												{
													goto IL_046f;
												}
												while (true)
												{
													// IL cpblk instruction
													System.Runtime.CompilerServices.Unsafe.CopyBlockUnaligned(ref cutscene_Wrestler, ptr3, 10);
													if (System.Runtime.CompilerServices.Unsafe.As<Cutscene_Wrestler, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref cutscene_Wrestler, 2)) == 0)
													{
														break;
													}
													int num10 = *(ushort*)(&cutscene_Wrestler);
													<Module>.CharProfileParameters.{ctor}(&charProfileParameters);
													try
													{
														int num11 = 0;
														ulong num12 = (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<CharProfileParameters,std::allocator<CharProfileParameters> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj3, 8)) - *(long*)(&obj3)) / 640);
														if (0 < num12)
														{
															long num13 = *(long*)(&obj3) + 10;
															do
															{
																if (*(byte*)num13 == 0 || *(ushort*)(num13 - 2) != num10)
																{
																	num11++;
																	num13 += 640;
																	continue;
																}
																<Module>.CharProfileParameters.=(&charProfileParameters, (CharProfileParameters*)((long)num11 * 640L + *(long*)(&obj3)));
																break;
															}
															while ((ulong)num11 < num12);
														}
														uint guid = ((System.Runtime.CompilerServices.Unsafe.As<CharProfileParameters, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref charProfileParameters, 76)) != 0) ? System.Runtime.CompilerServices.Unsafe.As<CharProfileParameters, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref charProfileParameters, 72)) : 0u);
														<Module>.GetStringFromSDB(&obj9, sdb, guid);
														try
														{
															basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr5 = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.substr(&obj9, &obj10, 0uL, 5uL);
															bool flag;
															try
															{
																flag = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(ptr5, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_05FAECCOPD@DUMMY@));
															}
															catch
															{
																//try-fault
																<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
																throw;
															}
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
															if (flag)
															{
																basic_string<char,std::char_traits<char>,std::allocator<char> >* right = <Module>.std.to_string(&obj11, num10);
																try
																{
																	<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.=(&obj9, right);
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
															if (System.Runtime.CompilerServices.Unsafe.As<basic_string<char,std::char_traits<char>,std::allocator<char> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj8, 16)) == 0L)
															{
																<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.=(&obj8, &obj9);
															}
															else
															{
																basic_string<char,std::char_traits<char>,std::allocator<char> >* left = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj12, &obj8, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_02KEGNLNML@?0?5@));
																try
																{
																	basic_string<char,std::char_traits<char>,std::allocator<char> >* right2 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj13, left, &obj9);
																	try
																	{
																		<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.=(&obj8, right2);
																	}
																	catch
																	{
																		//try-fault
																		<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj13);
																		throw;
																	}
																	try
																	{
																		<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj13);
																	}
																	catch
																	{
																		//try-fault
																		<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj13);
																		throw;
																	}
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
															}
															try
															{
															}
															catch
															{
																//try-fault
																<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj12);
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
														<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<CharProfileParameters*, void>)(&<Module>.CharProfileParameters.{dtor}), &charProfileParameters);
														throw;
													}
													<Module>.CharProfileParameters.{dtor}(&charProfileParameters);
													ptr3 = (Cutscene_Wrestler*)((ulong)(nint)ptr3 + 10uL);
													if (ptr3 != ptr4)
													{
														continue;
													}
													goto IL_046f;
												}
												goto end_IL_0238;
												IL_046f:
												basic_string<char,std::char_traits<char>,std::allocator<char> >* left2 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj14, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06NAHGBCDG@Type?3?5@), &obj5);
												try
												{
													basic_string<char,std::char_traits<char>,std::allocator<char> >* left3 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj15, left2, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06JAMPMHOJ@?0?5ID?3?5@));
													try
													{
														basic_string<char,std::char_traits<char>,std::allocator<char> >* left4 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj16, left3, &obj4);
														try
														{
															basic_string<char,std::char_traits<char>,std::allocator<char> >* left5 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj17, left4, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_02KEGNLNML@?0?5@));
															try
															{
																basic_string<char,std::char_traits<char>,std::allocator<char> >* left6 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj18, left5, &obj6);
																try
																{
																	basic_string<char,std::char_traits<char>,std::allocator<char> >* left7 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj19, left6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_02KEGNLNML@?0?5@));
																	try
																	{
																		<Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj20, left7, &obj8);
																	}
																	catch
																	{
																		//try-fault
																		<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj19);
																		throw;
																	}
																	try
																	{
																		try
																		{
																			<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj19);
																		}
																		catch
																		{
																			//try-fault
																			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj19);
																			throw;
																		}
																	}
																	catch
																	{
																		//try-fault
																		<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj20);
																		throw;
																	}
																}
																catch
																{
																	//try-fault
																	<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj18);
																	throw;
																}
																try
																{
																	try
																	{
																		<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj18);
																	}
																	catch
																	{
																		//try-fault
																		<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj18);
																		throw;
																	}
																}
																catch
																{
																	//try-fault
																	<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj20);
																	throw;
																}
															}
															catch
															{
																//try-fault
																<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj17);
																throw;
															}
															try
															{
																try
																{
																	<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj17);
																}
																catch
																{
																	//try-fault
																	<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj17);
																	throw;
																}
															}
															catch
															{
																//try-fault
																<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj20);
																throw;
															}
														}
														catch
														{
															//try-fault
															<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj16);
															throw;
														}
														try
														{
															try
															{
																<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj16);
															}
															catch
															{
																//try-fault
																<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj16);
																throw;
															}
														}
														catch
														{
															//try-fault
															<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj20);
															throw;
														}
													}
													catch
													{
														//try-fault
														<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj15);
														throw;
													}
													try
													{
														try
														{
															<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj15);
														}
														catch
														{
															//try-fault
															<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj15);
															throw;
														}
													}
													catch
													{
														//try-fault
														<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj20);
														throw;
													}
												}
												catch
												{
													//try-fault
													<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj14);
													throw;
												}
												try
												{
													try
													{
														<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj14);
													}
													catch
													{
														//try-fault
														<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj14);
														throw;
													}
													ListBox.ObjectCollection items = list_profiles.Items;
													string item = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(&obj20);
													items.Add(item);
												}
												catch
												{
													//try-fault
													<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj20);
													throw;
												}
												try
												{
													<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj20);
												}
												catch
												{
													//try-fault
													<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj20);
													throw;
												}
												goto IL_066a;
												end_IL_0238:;
											}
											catch
											{
												//try-fault
												<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj8);
												throw;
											}
											goto end_IL_01da;
											IL_066a:
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
											goto IL_0692;
											end_IL_01da:;
										}
										catch
										{
											//try-fault
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj6);
											throw;
										}
										goto end_IL_01ba;
										IL_0692:
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
										goto IL_06ba;
										end_IL_01ba:;
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj5);
										throw;
									}
									goto end_IL_01b0;
									IL_06ba:
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
									goto IL_06e2;
									end_IL_01b0:;
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj4);
									throw;
								}
								goto IL_0725;
								IL_0725:
								try
								{
									try
									{
										try
										{
											try
											{
												<Module>.std._Throw_bad_optional_access();
											}
											catch
											{
												//try-fault
												<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj8);
												throw;
											}
										}
										catch
										{
											//try-fault
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj6);
											throw;
										}
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj5);
										throw;
									}
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj4);
									throw;
								}
								goto IL_076a;
								IL_06e2:
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
								num2++;
								num3 += 128;
								continue;
								IL_076f:
								<Module>.std._Throw_bad_optional_access();
								break;
								IL_076a:
								<Module>.std._Throw_bad_optional_access();
								goto IL_076f;
							}
							while ((ulong)num2 < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<CutsceneData,std::allocator<CutsceneData> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj2, 8)) - *(long*)(&obj2) >> 7));
						}
						if (System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) == System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)))
						{
							int num14 = 0;
							if (num14 < list_profiles.Items.Count)
							{
								System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj21);
								do
								{
									ListBox.ObjectCollection items2 = list_profiles.Items;
									int index = num14;
									text = items2[index].ToString();
									<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj21, &text);
									try
									{
										<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >._Emplace_one_at_back<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > const &>((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A), &obj21);
										<Module>.std.vector<int,std::allocator<int> >._Emplace_one_at_back<int const &>((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A), &num14);
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj21);
										throw;
									}
									try
									{
										<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Tidy_deallocate(&obj21);
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj21);
										throw;
									}
									num14++;
								}
								while (num14 < list_profiles.Items.Count);
							}
						}
						<Module>.DeleteSDB(sdb);
						sdb = null;
						loggerBox.Text = "Entrance List Loaded!";
						loggerBox.Refresh();
					}
					catch
					{
						//try-fault
						<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<CharProfileParameters,std::allocator<CharProfileParameters> >*, void>)(&<Module>.std.vector<CharProfileParameters,std::allocator<CharProfileParameters> >.{dtor}), &obj3);
						throw;
					}
					<Module>.std.vector<CharProfileParameters,std::allocator<CharProfileParameters> >._Tidy(&obj3);
				}
				catch
				{
					//try-fault
					<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<CutsceneData,std::allocator<CutsceneData> >*, void>)(&<Module>.std.vector<CutsceneData,std::allocator<CutsceneData> >.{dtor}), &obj2);
					throw;
				}
				<Module>.std.vector<CutsceneData,std::allocator<CutsceneData> >._Tidy(&obj2);
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
		list_profiles.Items.Clear();
		System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<int,std::allocator<int> > obj);
		<Module>.std.vector<int,std::allocator<int> >.{ctor}(&obj);
		try
		{
			ulong num = 0uL;
			if (0uL < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)) - System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) >> 5))
			{
				long num2 = 0L;
				do
				{
					string text = new string(<Module>.std._String_val<std::_Simple_types<char> >._Myptr((_String_val<std::_Simple_types<char> >*)(num2 + System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A))));
					if (text.IndexOf(value, StringComparison.OrdinalIgnoreCase) != -1)
					{
						list_profiles.Items.Add(text);
						<Module>.std.vector<int,std::allocator<int> >._Emplace_one_at_back<int const &>(&obj, (int*)(num * 4 + (ulong)System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A)));
					}
					num++;
					num2 += 32;
				}
				while (num < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)) - System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) >> 5));
			}
			<Module>.std.vector<int,std::allocator<int> >.=((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A), &obj);
			if (list_profiles.Items.Count > 0)
			{
				list_profiles.SelectedIndex = 0;
			}
			else
			{
				list_profiles.SelectedIndex = -1;
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
		if (list_profiles.SelectedIndex == -1)
		{
			GC.KeepAlive(this);
			return -1;
		}
		int selectedIndex = list_profiles.SelectedIndex;
		if (System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A) == System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A, 8)))
		{
			if (selectedIndex >= 0)
			{
				ulong num = (ulong)selectedIndex;
				if (num < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A, 8)) - System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A) >> 2))
				{
					int result = *(int*)(num * 4 + (ulong)System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
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
			if (num2 < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A, 8)) - System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A) >> 2))
			{
				int result2 = *(int*)(num2 * 4 + (ulong)System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
				GC.KeepAlive(this);
				return result2;
			}
		}
		GC.KeepAlive(this);
		return -1;
	}

	private unsafe void btn_removeSelected_Click(object sender, EventArgs e)
	{
		marshal_context marshal_context2 = null;
		marshal_context marshal_context3 = new marshal_context();
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj);
		try
		{
			marshal_context2 = marshal_context3;
			<Module>.std._String_val<std::_Simple_types<char> >.{ctor}((_String_val<std::_Simple_types<char> >*)(&obj));
			try
			{
				<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Construct_empty(&obj);
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj);
				throw;
			}
			try
			{
				if (list_profiles.SelectedIndex != -1)
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj2);
					basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr = marshal_context2.marshal_as<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,System::String>(&obj2, list_profiles.SelectedItem.ToString());
					try
					{
						sbyte* ptr2 = <Module>.std._String_val<std::_Simple_types<char> >._Myptr((_String_val<std::_Simple_types<char> >*)ptr);
						<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.=(&obj, ptr2);
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
					if (<Module>.RemoveCutsceneAtIndex(GetOriginalIndexOfSelectedItem()))
					{
						goto IL_00fb;
					}
					loggerBox.Text = "ERROR: Failed to remove cutscene!";
					loggerBox.Refresh();
					GC.KeepAlive(this);
					goto IL_00cf;
				}
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj);
				throw;
			}
			goto end_IL_0008;
			IL_00cf:
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
			goto IL_00ef;
			end_IL_0008:;
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
				loggerBox.Text = "ERROR: You must select a cutscene to remove!";
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
		IL_00fb:
		try
		{
			try
			{
				btn_LoadCharMaps_Click(null, null);
				loggerBox.Text = "Cutscene Removed!";
				loggerBox.Refresh();
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
		IL_00ef:
		((IDisposable)marshal_context2).Dispose();
	}

	private unsafe void btn_CreateEntrance_Click(object sender, EventArgs e)
	{
		//IL_0037: Expected I, but got I8
		//IL_006d: Expected I, but got I8
		//IL_00a2: Expected I, but got I8
		//IL_00d6: Expected I, but got I8
		//IL_010a: Expected I, but got I8
		uint num = 0u;
		string text = input_animID.Text;
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj);
		<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj, &text);
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj2);
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj3);
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj4);
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj5);
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj6);
		try
		{
			int animID = ((System.Runtime.CompilerServices.Unsafe.As<basic_string<char,std::char_traits<char>,std::allocator<char> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj, 16)) != 0) ? <Module>.std.stoi(&obj, null, 10) : 0);
			string text2 = input_wrestlerID1.Text;
			<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj2, &text2);
			try
			{
				int wrestlerID_ = ((System.Runtime.CompilerServices.Unsafe.As<basic_string<char,std::char_traits<char>,std::allocator<char> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj2, 16)) != 0) ? <Module>.std.stoi(&obj2, null, 10) : 0);
				string text3 = input_wrestlerID2.Text;
				<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj3, &text3);
				try
				{
					int wrestlerID_2 = ((System.Runtime.CompilerServices.Unsafe.As<basic_string<char,std::char_traits<char>,std::allocator<char> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj3, 16)) != 0) ? <Module>.std.stoi(&obj3, null, 10) : 0);
					string text4 = input_wrestlerID3.Text;
					<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj4, &text4);
					try
					{
						int wrestlerID_3 = ((System.Runtime.CompilerServices.Unsafe.As<basic_string<char,std::char_traits<char>,std::allocator<char> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj4, 16)) != 0) ? <Module>.std.stoi(&obj4, null, 10) : 0);
						string text5 = input_wrestlerID4.Text;
						<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj5, &text5);
						try
						{
							int wrestlerID_4 = ((System.Runtime.CompilerServices.Unsafe.As<basic_string<char,std::char_traits<char>,std::allocator<char> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj5, 16)) != 0) ? <Module>.std.stoi(&obj5, null, 10) : 0);
							string text6 = cb_Category.Text;
							<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj6, &text6);
							try
							{
								int category;
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BC@ODBCEJJM@Entrance?5Override@)))
								{
									category = 0;
									goto IL_01e3;
								}
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BG@EOIHHPJC@Entrance?5With?5Manager@)))
								{
									category = 1;
									goto IL_01e3;
								}
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BF@EJKDJIHO@Victory?5With?5Manager@)))
								{
									category = 2;
									goto IL_01e3;
								}
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0P@DCNJMHBA@4?9Man?5Entrance@)))
								{
									category = 3;
									goto IL_01e3;
								}
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BL@BFCDMMDH@3?9Man?5Roman?5Title?5Entrance@)))
								{
									category = 4;
									goto IL_01e3;
								}
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0CC@FLIKPPHB@Roman?5Title?5Entrance?5With?5Manag@)))
								{
									category = 5;
									goto IL_01e3;
								}
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0CB@JOAODCCD@Roman?5Title?5Victory?5With?5Manage@)))
								{
									category = 6;
									goto IL_01e3;
								}
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0P@KJNIMIAK@3?9Man?5Entrance@)))
								{
									category = 7;
									goto IL_01e3;
								}
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BC@NHNEFBML@Tag?5Team?5Entrance@)))
								{
									category = 8;
									goto IL_01e3;
								}
								if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BL@MHPGIKLB@4?9Man?5Roman?5Title?5Entrance@)))
								{
									category = 9;
									goto IL_01e3;
								}
								goto end_IL_0122;
								IL_01e3:
								if (<Module>.AddCutsceneEntry(category, (uint)animID, wrestlerID_, wrestlerID_2, wrestlerID_3, wrestlerID_4, cb_SetForTitleEntrance.Checked))
								{
									loggerBox.Text = "Cutscene Data Added Successfully!";
									loggerBox.Refresh();
									System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj7);
									basic_string<char,std::char_traits<char>,std::allocator<char> >* pThis = &obj7;
									basic_string<char,std::char_traits<char>,std::allocator<char> >* bakeName = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj7, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
									basic_string<char,std::char_traits<char>,std::allocator<char> >* folderInTributeToBake;
									try
									{
										System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj8);
										basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr = &obj8;
										folderInTributeToBake = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj8, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), pThis);
										throw;
									}
									<Module>.TellCakeviewToBake(folderInTributeToBake, bakeName);
									btn_LoadCharMaps_Click(null, null);
								}
								else
								{
									loggerBox.Text = "Failed! Check fields contain valid input!";
									loggerBox.Refresh();
								}
								goto IL_0290;
								end_IL_0122:;
							}
							catch
							{
								//try-fault
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj6);
								throw;
							}
							goto end_IL_00ee;
							IL_0290:
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
							goto IL_02b8;
							end_IL_00ee:;
						}
						catch
						{
							//try-fault
							<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj5);
							throw;
						}
						goto end_IL_00ba;
						IL_02b8:
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
						goto IL_02e0;
						end_IL_00ba:;
					}
					catch
					{
						//try-fault
						<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj4);
						throw;
					}
					goto end_IL_0086;
					IL_02e0:
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
					goto IL_0308;
					end_IL_0086:;
				}
				catch
				{
					//try-fault
					<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj3);
					throw;
				}
				goto end_IL_0050;
				IL_0308:
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
				goto IL_0330;
				end_IL_0050:;
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj2);
				throw;
			}
			goto end_IL_001a;
			IL_0330:
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
			goto IL_0358;
			end_IL_001a:;
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj);
			throw;
		}
		try
		{
			try
			{
				try
				{
					try
					{
						try
						{
							try
							{
								loggerBox.Text = "Please select a valid category!";
								loggerBox.Refresh();
								GC.KeepAlive(this);
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
			return;
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<_Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>*, void>)(&<Module>.std._Compressed_pair<std::allocator<char>,std::_String_val<std::_Simple_types<char> >,1>.{dtor}), &obj);
			throw;
		}
		IL_0358:
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
		GC.KeepAlive(this);
	}

	private unsafe void cb_Category_SelectedIndexChanged(object sender, EventArgs e)
	{
		uint num = 0u;
		string text = cb_Category.Text;
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj);
		<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj, &text);
		try
		{
			if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BC@ODBCEJJM@Entrance?5Override@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = false;
				input_wrestlerID3.Enabled = false;
				input_wrestlerID4.Enabled = false;
				input_animID.Enabled = true;
				TextBox textBox = input_wrestlerID1;
				Color backColor = SystemColors.Window;
				textBox.BackColor = backColor;
				TextBox textBox2 = input_wrestlerID2;
				Color controlDark = SystemColors.ControlDark;
				textBox2.BackColor = controlDark;
				TextBox textBox3 = input_wrestlerID3;
				Color controlDark2 = SystemColors.ControlDark;
				textBox3.BackColor = controlDark2;
				TextBox textBox4 = input_wrestlerID4;
				Color controlDark3 = SystemColors.ControlDark;
				textBox4.BackColor = controlDark3;
				TextBox textBox5 = input_animID;
				Color backColor2 = SystemColors.Window;
				textBox5.BackColor = backColor2;
				input_wrestlerID2.Text = "";
				input_wrestlerID3.Text = "";
				input_wrestlerID4.Text = "";
			}
			else if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BG@EOIHHPJC@Entrance?5With?5Manager@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = false;
				input_wrestlerID4.Enabled = false;
				input_animID.Enabled = true;
				TextBox textBox6 = input_wrestlerID1;
				Color backColor3 = SystemColors.Window;
				textBox6.BackColor = backColor3;
				TextBox textBox7 = input_wrestlerID2;
				Color backColor4 = SystemColors.Window;
				textBox7.BackColor = backColor4;
				TextBox textBox8 = input_wrestlerID3;
				Color controlDark4 = SystemColors.ControlDark;
				textBox8.BackColor = controlDark4;
				TextBox textBox9 = input_wrestlerID4;
				Color controlDark5 = SystemColors.ControlDark;
				textBox9.BackColor = controlDark5;
				TextBox textBox10 = input_animID;
				Color backColor5 = SystemColors.Window;
				textBox10.BackColor = backColor5;
				input_wrestlerID3.Text = "";
				input_wrestlerID4.Text = "";
			}
			else if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BC@NHNEFBML@Tag?5Team?5Entrance@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = false;
				input_wrestlerID4.Enabled = false;
				input_animID.Enabled = true;
				TextBox textBox11 = input_wrestlerID1;
				Color backColor6 = SystemColors.Window;
				textBox11.BackColor = backColor6;
				TextBox textBox12 = input_wrestlerID2;
				Color backColor7 = SystemColors.Window;
				textBox12.BackColor = backColor7;
				TextBox textBox13 = input_wrestlerID3;
				Color controlDark6 = SystemColors.ControlDark;
				textBox13.BackColor = controlDark6;
				TextBox textBox14 = input_wrestlerID4;
				Color controlDark7 = SystemColors.ControlDark;
				textBox14.BackColor = controlDark7;
				TextBox textBox15 = input_animID;
				Color backColor8 = SystemColors.Window;
				textBox15.BackColor = backColor8;
				input_wrestlerID3.Text = "";
				input_wrestlerID4.Text = "";
			}
			else if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BF@EJKDJIHO@Victory?5With?5Manager@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = false;
				input_wrestlerID4.Enabled = false;
				input_animID.Enabled = true;
				TextBox textBox16 = input_wrestlerID1;
				Color backColor9 = SystemColors.Window;
				textBox16.BackColor = backColor9;
				TextBox textBox17 = input_wrestlerID2;
				Color backColor10 = SystemColors.Window;
				textBox17.BackColor = backColor10;
				TextBox textBox18 = input_wrestlerID3;
				Color controlDark8 = SystemColors.ControlDark;
				textBox18.BackColor = controlDark8;
				TextBox textBox19 = input_wrestlerID4;
				Color controlDark9 = SystemColors.ControlDark;
				textBox19.BackColor = controlDark9;
				TextBox textBox20 = input_animID;
				Color backColor11 = SystemColors.Window;
				textBox20.BackColor = backColor11;
				input_wrestlerID3.Text = "";
				input_wrestlerID4.Text = "";
			}
			else if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0P@KJNIMIAK@3?9Man?5Entrance@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = true;
				input_wrestlerID4.Enabled = false;
				input_animID.Enabled = true;
				TextBox textBox21 = input_wrestlerID1;
				Color backColor12 = SystemColors.Window;
				textBox21.BackColor = backColor12;
				TextBox textBox22 = input_wrestlerID2;
				Color backColor13 = SystemColors.Window;
				textBox22.BackColor = backColor13;
				TextBox textBox23 = input_wrestlerID3;
				Color backColor14 = SystemColors.Window;
				textBox23.BackColor = backColor14;
				TextBox textBox24 = input_wrestlerID4;
				Color controlDark10 = SystemColors.ControlDark;
				textBox24.BackColor = controlDark10;
				TextBox textBox25 = input_animID;
				Color backColor15 = SystemColors.Window;
				textBox25.BackColor = backColor15;
			}
			else if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0P@DCNJMHBA@4?9Man?5Entrance@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = true;
				input_wrestlerID4.Enabled = true;
				input_animID.Enabled = true;
				TextBox textBox26 = input_wrestlerID1;
				Color backColor16 = SystemColors.Window;
				textBox26.BackColor = backColor16;
				TextBox textBox27 = input_wrestlerID2;
				Color backColor17 = SystemColors.Window;
				textBox27.BackColor = backColor17;
				TextBox textBox28 = input_wrestlerID3;
				Color backColor18 = SystemColors.Window;
				textBox28.BackColor = backColor18;
				TextBox textBox29 = input_wrestlerID4;
				Color backColor19 = SystemColors.Window;
				textBox29.BackColor = backColor19;
				TextBox textBox30 = input_animID;
				Color backColor20 = SystemColors.Window;
				textBox30.BackColor = backColor20;
			}
			else if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BL@BFCDMMDH@3?9Man?5Roman?5Title?5Entrance@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = true;
				input_wrestlerID4.Enabled = false;
				input_animID.Enabled = false;
				TextBox textBox31 = input_wrestlerID1;
				Color backColor21 = SystemColors.Window;
				textBox31.BackColor = backColor21;
				TextBox textBox32 = input_wrestlerID2;
				Color backColor22 = SystemColors.Window;
				textBox32.BackColor = backColor22;
				TextBox textBox33 = input_wrestlerID3;
				Color backColor23 = SystemColors.Window;
				textBox33.BackColor = backColor23;
				TextBox textBox34 = input_wrestlerID4;
				Color controlDark11 = SystemColors.ControlDark;
				textBox34.BackColor = controlDark11;
				TextBox textBox35 = input_animID;
				Color controlDark12 = SystemColors.ControlDark;
				textBox35.BackColor = controlDark12;
			}
			else if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0BL@MHPGIKLB@4?9Man?5Roman?5Title?5Entrance@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = true;
				input_wrestlerID4.Enabled = true;
				input_animID.Enabled = false;
				TextBox textBox36 = input_wrestlerID1;
				Color backColor24 = SystemColors.Window;
				textBox36.BackColor = backColor24;
				TextBox textBox37 = input_wrestlerID2;
				Color backColor25 = SystemColors.Window;
				textBox37.BackColor = backColor25;
				TextBox textBox38 = input_wrestlerID3;
				Color backColor26 = SystemColors.Window;
				textBox38.BackColor = backColor26;
				TextBox textBox39 = input_wrestlerID4;
				Color backColor27 = SystemColors.Window;
				textBox39.BackColor = backColor27;
				TextBox textBox40 = input_animID;
				Color controlDark13 = SystemColors.ControlDark;
				textBox40.BackColor = controlDark13;
			}
			else if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0CC@FLIKPPHB@Roman?5Title?5Entrance?5With?5Manag@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = false;
				input_wrestlerID4.Enabled = false;
				input_animID.Enabled = false;
				TextBox textBox41 = input_wrestlerID1;
				Color backColor28 = SystemColors.Window;
				textBox41.BackColor = backColor28;
				TextBox textBox42 = input_wrestlerID2;
				Color backColor29 = SystemColors.Window;
				textBox42.BackColor = backColor29;
				TextBox textBox43 = input_wrestlerID3;
				Color controlDark14 = SystemColors.ControlDark;
				textBox43.BackColor = controlDark14;
				TextBox textBox44 = input_wrestlerID4;
				Color controlDark15 = SystemColors.ControlDark;
				textBox44.BackColor = controlDark15;
				TextBox textBox45 = input_animID;
				Color controlDark16 = SystemColors.ControlDark;
				textBox45.BackColor = controlDark16;
			}
			else if (<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >._Equal(&obj, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0CB@JOAODCCD@Roman?5Title?5Victory?5With?5Manage@)))
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = false;
				input_wrestlerID4.Enabled = false;
				input_animID.Enabled = false;
				TextBox textBox46 = input_wrestlerID1;
				Color backColor30 = SystemColors.Window;
				textBox46.BackColor = backColor30;
				TextBox textBox47 = input_wrestlerID2;
				Color backColor31 = SystemColors.Window;
				textBox47.BackColor = backColor31;
				TextBox textBox48 = input_wrestlerID3;
				Color controlDark17 = SystemColors.ControlDark;
				textBox48.BackColor = controlDark17;
				TextBox textBox49 = input_wrestlerID4;
				Color controlDark18 = SystemColors.ControlDark;
				textBox49.BackColor = controlDark18;
				TextBox textBox50 = input_animID;
				Color controlDark19 = SystemColors.ControlDark;
				textBox50.BackColor = controlDark19;
			}
			else
			{
				input_wrestlerID1.Enabled = true;
				input_wrestlerID2.Enabled = true;
				input_wrestlerID3.Enabled = true;
				input_wrestlerID4.Enabled = true;
				input_animID.Enabled = true;
				TextBox textBox51 = input_wrestlerID1;
				Color backColor32 = SystemColors.Window;
				textBox51.BackColor = backColor32;
				TextBox textBox52 = input_wrestlerID2;
				Color backColor33 = SystemColors.Window;
				textBox52.BackColor = backColor33;
				TextBox textBox53 = input_wrestlerID3;
				Color backColor34 = SystemColors.Window;
				textBox53.BackColor = backColor34;
				TextBox textBox54 = input_wrestlerID4;
				Color backColor35 = SystemColors.Window;
				textBox54.BackColor = backColor35;
				TextBox textBox55 = input_animID;
				Color backColor36 = SystemColors.Window;
				textBox55.BackColor = backColor36;
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
		GC.KeepAlive(this);
	}

	private static void LoadIDList()
	{
		new CutsceneIDList().ShowDialog();
	}

	private unsafe void btn_AnimIDList_Click(object sender, EventArgs e)
	{
		uint num = 0u;
		System.Runtime.CompilerServices.Unsafe.SkipInit(out thread thread2);
		<Module>.std.thread._Start<void (__clrcall&)(void)>(&thread2, (delegate*<void>)(&LoadIDList));
		try
		{
			<Module>.std.thread.detach(&thread2);
		}
		catch
		{
			//try-fault
			<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<thread*, void>)(&<Module>.std.thread.{dtor}), &thread2);
			throw;
		}
		if (System.Runtime.CompilerServices.Unsafe.As<thread, int>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref thread2, 8)) != 0)
		{
			<Module>.terminate();
		}
		GC.KeepAlive(this);
	}

	private void btn_ViewRosterList_Click(object sender, EventArgs e)
	{
		new EditRosterListView(noCManagerButton: true).ShowDialog();
		GC.KeepAlive(this);
	}

	[HandleProcessCorruptedStateExceptions]
	protected override void Dispose([MarshalAs(UnmanagedType.U1)] bool A_0)
	{
		if (A_0)
		{
			try
			{
				~CutsceneEditor();
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
