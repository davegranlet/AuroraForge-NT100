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

public class VictoryTemplateEditor : Form
{
	private Button btn_SaveAsNew;

	private Label label8;

	private TextBox input_TitleHeel;

	private Label label7;

	private TextBox input_TitleFace;

	private Label label6;

	private TextBox input_VictoryHeel;

	private Label label5;

	private TextBox input_VictoryFace;

	private Label label3;

	private TextBox input_EntranceType;

	private Label label1;

	private TextBox input_NameSDBID;

	private Label label2;

	private Button btn_SaveChanges;

	private Label label10;

	private TextBox input_templateID;

	private Label loggerBox;

	private Button btn_removeSelected;

	private Label label4;

	private TextBox input_searchBox;

	private Button btn_EditSelected;

	private Label label18;

	private Button btn_LoadGFXList;

	private ListBox list_GFXEntries;

	private Button btn_AnimIDList;

	private Button btn_EditMusicList;

	private Label label12;

	private TextBox input_MusicID;

	private Label label9;

	private TextBox input_doubleTitle;

	private Button btn_SDB;

	private Button button11;

	private Container components;

	public VictoryTemplateEditor()
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

	private void ~VictoryTemplateEditor()
	{
		((IDisposable)components)?.Dispose();
		GC.KeepAlive(this);
	}

	private void InitializeComponent()
	{
		System.ComponentModel.ComponentResourceManager resources = new System.ComponentModel.ComponentResourceManager(typeof(TRIBUTE26.VictoryTemplateEditor));
		this.btn_SaveAsNew = new System.Windows.Forms.Button();
		this.label8 = new System.Windows.Forms.Label();
		this.input_TitleHeel = new System.Windows.Forms.TextBox();
		this.label7 = new System.Windows.Forms.Label();
		this.input_TitleFace = new System.Windows.Forms.TextBox();
		this.label6 = new System.Windows.Forms.Label();
		this.input_VictoryHeel = new System.Windows.Forms.TextBox();
		this.label5 = new System.Windows.Forms.Label();
		this.input_VictoryFace = new System.Windows.Forms.TextBox();
		this.label3 = new System.Windows.Forms.Label();
		this.input_EntranceType = new System.Windows.Forms.TextBox();
		this.label1 = new System.Windows.Forms.Label();
		this.input_NameSDBID = new System.Windows.Forms.TextBox();
		this.label2 = new System.Windows.Forms.Label();
		this.btn_SaveChanges = new System.Windows.Forms.Button();
		this.label10 = new System.Windows.Forms.Label();
		this.input_templateID = new System.Windows.Forms.TextBox();
		this.loggerBox = new System.Windows.Forms.Label();
		this.btn_removeSelected = new System.Windows.Forms.Button();
		this.label4 = new System.Windows.Forms.Label();
		this.input_searchBox = new System.Windows.Forms.TextBox();
		this.btn_EditSelected = new System.Windows.Forms.Button();
		this.label18 = new System.Windows.Forms.Label();
		this.btn_LoadGFXList = new System.Windows.Forms.Button();
		this.list_GFXEntries = new System.Windows.Forms.ListBox();
		this.btn_AnimIDList = new System.Windows.Forms.Button();
		this.btn_EditMusicList = new System.Windows.Forms.Button();
		this.label12 = new System.Windows.Forms.Label();
		this.input_MusicID = new System.Windows.Forms.TextBox();
		this.label9 = new System.Windows.Forms.Label();
		this.input_doubleTitle = new System.Windows.Forms.TextBox();
		this.btn_SDB = new System.Windows.Forms.Button();
		this.button11 = new System.Windows.Forms.Button();
		base.SuspendLayout();
		System.Windows.Forms.Button button = this.btn_SaveAsNew;
		System.Drawing.Color backColor = System.Drawing.Color.FromArgb(40, 40, 40);
		button.BackColor = backColor;
		this.btn_SaveAsNew.FlatAppearance.BorderSize = 0;
		this.btn_SaveAsNew.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button2 = this.btn_SaveAsNew;
		System.Drawing.Font font = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button2.Font = font;
		System.Windows.Forms.Button button3 = this.btn_SaveAsNew;
		System.Drawing.Color control = System.Drawing.SystemColors.Control;
		button3.ForeColor = control;
		System.Windows.Forms.Button button4 = this.btn_SaveAsNew;
		System.Drawing.Point location = new System.Drawing.Point(541, 556);
		button4.Location = location;
		this.btn_SaveAsNew.Name = "btn_SaveAsNew";
		System.Windows.Forms.Button button5 = this.btn_SaveAsNew;
		System.Drawing.Size size = new System.Drawing.Size(448, 39);
		button5.Size = size;
		this.btn_SaveAsNew.TabIndex = 616;
		this.btn_SaveAsNew.Text = "SAVE AS NEW";
		this.btn_SaveAsNew.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button6 = this.btn_SaveAsNew;
		System.EventHandler value = new System.EventHandler(this.btn_SaveAsNew_Click);
		button6.Click += value;
		this.label8.AutoSize = true;
		System.Windows.Forms.Label label = this.label8;
		System.Drawing.Font font2 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label.Font = font2;
		System.Windows.Forms.Label label2 = this.label8;
		System.Drawing.Color controlLightLight = System.Drawing.SystemColors.ControlLightLight;
		label2.ForeColor = controlLightLight;
		System.Windows.Forms.Label label3 = this.label8;
		System.Drawing.Point location2 = new System.Drawing.Point(537, 362);
		label3.Location = location2;
		this.label8.Name = "label8";
		System.Windows.Forms.Label label4 = this.label8;
		System.Drawing.Size size2 = new System.Drawing.Size(97, 22);
		label4.Size = size2;
		this.label8.TabIndex = 611;
		this.label8.Text = "Title Heel";
		System.Windows.Forms.TextBox textBox = this.input_TitleHeel;
		System.Drawing.Color control2 = System.Drawing.SystemColors.Control;
		textBox.BackColor = control2;
		System.Windows.Forms.TextBox textBox2 = this.input_TitleHeel;
		System.Drawing.Font font3 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox2.Font = font3;
		System.Windows.Forms.TextBox textBox3 = this.input_TitleHeel;
		System.Drawing.Point location3 = new System.Drawing.Point(757, 359);
		textBox3.Location = location3;
		this.input_TitleHeel.Name = "input_TitleHeel";
		System.Windows.Forms.TextBox textBox4 = this.input_TitleHeel;
		System.Drawing.Size size3 = new System.Drawing.Size(155, 29);
		textBox4.Size = size3;
		this.input_TitleHeel.TabIndex = 610;
		this.label7.AutoSize = true;
		System.Windows.Forms.Label label5 = this.label7;
		System.Drawing.Font font4 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label5.Font = font4;
		System.Windows.Forms.Label label6 = this.label7;
		System.Drawing.Color controlLightLight2 = System.Drawing.SystemColors.ControlLightLight;
		label6.ForeColor = controlLightLight2;
		System.Windows.Forms.Label label7 = this.label7;
		System.Drawing.Point location4 = new System.Drawing.Point(537, 327);
		label7.Location = location4;
		this.label7.Name = "label7";
		System.Windows.Forms.Label label8 = this.label7;
		System.Drawing.Size size4 = new System.Drawing.Size(98, 22);
		label8.Size = size4;
		this.label7.TabIndex = 609;
		this.label7.Text = "Title Face";
		System.Windows.Forms.TextBox textBox5 = this.input_TitleFace;
		System.Drawing.Color control3 = System.Drawing.SystemColors.Control;
		textBox5.BackColor = control3;
		System.Windows.Forms.TextBox textBox6 = this.input_TitleFace;
		System.Drawing.Font font5 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox6.Font = font5;
		System.Windows.Forms.TextBox textBox7 = this.input_TitleFace;
		System.Drawing.Point location5 = new System.Drawing.Point(757, 324);
		textBox7.Location = location5;
		this.input_TitleFace.Name = "input_TitleFace";
		System.Windows.Forms.TextBox textBox8 = this.input_TitleFace;
		System.Drawing.Size size5 = new System.Drawing.Size(155, 29);
		textBox8.Size = size5;
		this.input_TitleFace.TabIndex = 608;
		this.label6.AutoSize = true;
		System.Windows.Forms.Label label9 = this.label6;
		System.Drawing.Font font6 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label9.Font = font6;
		System.Windows.Forms.Label label10 = this.label6;
		System.Drawing.Color controlLightLight3 = System.Drawing.SystemColors.ControlLightLight;
		label10.ForeColor = controlLightLight3;
		System.Windows.Forms.Label label11 = this.label6;
		System.Drawing.Point location6 = new System.Drawing.Point(537, 292);
		label11.Location = location6;
		this.label6.Name = "label6";
		System.Windows.Forms.Label label12 = this.label6;
		System.Drawing.Size size6 = new System.Drawing.Size(123, 22);
		label12.Size = size6;
		this.label6.TabIndex = 607;
		this.label6.Text = "Victory Heel";
		System.Windows.Forms.TextBox textBox9 = this.input_VictoryHeel;
		System.Drawing.Color control4 = System.Drawing.SystemColors.Control;
		textBox9.BackColor = control4;
		System.Windows.Forms.TextBox textBox10 = this.input_VictoryHeel;
		System.Drawing.Font font7 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox10.Font = font7;
		System.Windows.Forms.TextBox textBox11 = this.input_VictoryHeel;
		System.Drawing.Point location7 = new System.Drawing.Point(757, 289);
		textBox11.Location = location7;
		this.input_VictoryHeel.Name = "input_VictoryHeel";
		System.Windows.Forms.TextBox textBox12 = this.input_VictoryHeel;
		System.Drawing.Size size7 = new System.Drawing.Size(155, 29);
		textBox12.Size = size7;
		this.input_VictoryHeel.TabIndex = 606;
		this.label5.AutoSize = true;
		System.Windows.Forms.Label label13 = this.label5;
		System.Drawing.Font font8 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label13.Font = font8;
		System.Windows.Forms.Label label14 = this.label5;
		System.Drawing.Color controlLightLight4 = System.Drawing.SystemColors.ControlLightLight;
		label14.ForeColor = controlLightLight4;
		System.Windows.Forms.Label label15 = this.label5;
		System.Drawing.Point location8 = new System.Drawing.Point(537, 257);
		label15.Location = location8;
		this.label5.Name = "label5";
		System.Windows.Forms.Label label16 = this.label5;
		System.Drawing.Size size8 = new System.Drawing.Size(124, 22);
		label16.Size = size8;
		this.label5.TabIndex = 605;
		this.label5.Text = "Victory Face";
		System.Windows.Forms.TextBox textBox13 = this.input_VictoryFace;
		System.Drawing.Color control5 = System.Drawing.SystemColors.Control;
		textBox13.BackColor = control5;
		System.Windows.Forms.TextBox textBox14 = this.input_VictoryFace;
		System.Drawing.Font font9 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox14.Font = font9;
		System.Windows.Forms.TextBox textBox15 = this.input_VictoryFace;
		System.Drawing.Point location9 = new System.Drawing.Point(757, 254);
		textBox15.Location = location9;
		this.input_VictoryFace.Name = "input_VictoryFace";
		System.Windows.Forms.TextBox textBox16 = this.input_VictoryFace;
		System.Drawing.Size size9 = new System.Drawing.Size(155, 29);
		textBox16.Size = size9;
		this.input_VictoryFace.TabIndex = 604;
		this.label3.AutoSize = true;
		System.Windows.Forms.Label label17 = this.label3;
		System.Drawing.Font font10 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label17.Font = font10;
		System.Windows.Forms.Label label18 = this.label3;
		System.Drawing.Color controlLightLight5 = System.Drawing.SystemColors.ControlLightLight;
		label18.ForeColor = controlLightLight5;
		System.Windows.Forms.Label label19 = this.label3;
		System.Drawing.Point location10 = new System.Drawing.Point(537, 222);
		label19.Location = location10;
		this.label3.Name = "label3";
		System.Windows.Forms.Label label20 = this.label3;
		System.Drawing.Size size10 = new System.Drawing.Size(56, 22);
		label20.Size = size10;
		this.label3.TabIndex = 603;
		this.label3.Text = "Type";
		System.Windows.Forms.TextBox textBox17 = this.input_EntranceType;
		System.Drawing.Color control6 = System.Drawing.SystemColors.Control;
		textBox17.BackColor = control6;
		System.Windows.Forms.TextBox textBox18 = this.input_EntranceType;
		System.Drawing.Font font11 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox18.Font = font11;
		System.Windows.Forms.TextBox textBox19 = this.input_EntranceType;
		System.Drawing.Point location11 = new System.Drawing.Point(757, 219);
		textBox19.Location = location11;
		this.input_EntranceType.Name = "input_EntranceType";
		System.Windows.Forms.TextBox textBox20 = this.input_EntranceType;
		System.Drawing.Size size11 = new System.Drawing.Size(155, 29);
		textBox20.Size = size11;
		this.input_EntranceType.TabIndex = 602;
		this.label1.AutoSize = true;
		System.Windows.Forms.Label label21 = this.label1;
		System.Drawing.Font font12 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label21.Font = font12;
		System.Windows.Forms.Label label22 = this.label1;
		System.Drawing.Color controlLightLight6 = System.Drawing.SystemColors.ControlLightLight;
		label22.ForeColor = controlLightLight6;
		System.Windows.Forms.Label label23 = this.label1;
		System.Drawing.Point location12 = new System.Drawing.Point(537, 187);
		label23.Location = location12;
		this.label1.Name = "label1";
		System.Windows.Forms.Label label24 = this.label1;
		System.Drawing.Size size12 = new System.Drawing.Size(106, 22);
		label24.Size = size12;
		this.label1.TabIndex = 601;
		this.label1.Text = "Name SDB";
		System.Windows.Forms.TextBox textBox21 = this.input_NameSDBID;
		System.Drawing.Color control7 = System.Drawing.SystemColors.Control;
		textBox21.BackColor = control7;
		System.Windows.Forms.TextBox textBox22 = this.input_NameSDBID;
		System.Drawing.Font font13 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox22.Font = font13;
		System.Windows.Forms.TextBox textBox23 = this.input_NameSDBID;
		System.Drawing.Point location13 = new System.Drawing.Point(757, 184);
		textBox23.Location = location13;
		this.input_NameSDBID.Name = "input_NameSDBID";
		System.Windows.Forms.TextBox textBox24 = this.input_NameSDBID;
		System.Drawing.Size size13 = new System.Drawing.Size(155, 29);
		textBox24.Size = size13;
		this.input_NameSDBID.TabIndex = 600;
		this.label2.AutoSize = true;
		System.Windows.Forms.Label label25 = this.label2;
		System.Drawing.Font font14 = new System.Drawing.Font("Rockwell", 13.8f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label25.Font = font14;
		System.Windows.Forms.Label label26 = this.label2;
		System.Drawing.Color controlLightLight7 = System.Drawing.SystemColors.ControlLightLight;
		label26.ForeColor = controlLightLight7;
		System.Windows.Forms.Label label27 = this.label2;
		System.Drawing.Point location14 = new System.Drawing.Point(536, 76);
		label27.Location = location14;
		this.label2.Name = "label2";
		System.Windows.Forms.Label label28 = this.label2;
		System.Drawing.Size size14 = new System.Drawing.Size(208, 26);
		label28.Size = size14;
		this.label2.TabIndex = 599;
		this.label2.Text = "Selected Template";
		System.Windows.Forms.Button button7 = this.btn_SaveChanges;
		System.Drawing.Color backColor2 = System.Drawing.Color.FromArgb(40, 40, 40);
		button7.BackColor = backColor2;
		this.btn_SaveChanges.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button8 = this.btn_SaveChanges;
		System.Drawing.Font font15 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button8.Font = font15;
		System.Windows.Forms.Button button9 = this.btn_SaveChanges;
		System.Drawing.Color control8 = System.Drawing.SystemColors.Control;
		button9.ForeColor = control8;
		System.Windows.Forms.Button button10 = this.btn_SaveChanges;
		System.Drawing.Point location15 = new System.Drawing.Point(541, 511);
		button10.Location = location15;
		this.btn_SaveChanges.Name = "btn_SaveChanges";
		System.Windows.Forms.Button button11 = this.btn_SaveChanges;
		System.Drawing.Size size15 = new System.Drawing.Size(448, 39);
		button11.Size = size15;
		this.btn_SaveChanges.TabIndex = 598;
		this.btn_SaveChanges.Text = "SAVE CHANGES";
		this.btn_SaveChanges.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button12 = this.btn_SaveChanges;
		System.EventHandler value2 = new System.EventHandler(this.btn_SaveChanges_Click);
		button12.Click += value2;
		this.label10.AutoSize = true;
		System.Windows.Forms.Label label29 = this.label10;
		System.Drawing.Font font16 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label29.Font = font16;
		System.Windows.Forms.Label label30 = this.label10;
		System.Drawing.Color controlLightLight8 = System.Drawing.SystemColors.ControlLightLight;
		label30.ForeColor = controlLightLight8;
		System.Windows.Forms.Label label31 = this.label10;
		System.Drawing.Point location16 = new System.Drawing.Point(537, 152);
		label31.Location = location16;
		this.label10.Name = "label10";
		System.Windows.Forms.Label label32 = this.label10;
		System.Drawing.Size size16 = new System.Drawing.Size(122, 22);
		label32.Size = size16;
		this.label10.TabIndex = 597;
		this.label10.Text = "Template ID";
		System.Windows.Forms.TextBox textBox25 = this.input_templateID;
		System.Drawing.Color control9 = System.Drawing.SystemColors.Control;
		textBox25.BackColor = control9;
		System.Windows.Forms.TextBox textBox26 = this.input_templateID;
		System.Drawing.Font font17 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox26.Font = font17;
		System.Windows.Forms.TextBox textBox27 = this.input_templateID;
		System.Drawing.Point location17 = new System.Drawing.Point(757, 149);
		textBox27.Location = location17;
		this.input_templateID.Name = "input_templateID";
		System.Windows.Forms.TextBox textBox28 = this.input_templateID;
		System.Drawing.Size size17 = new System.Drawing.Size(155, 29);
		textBox28.Size = size17;
		this.input_templateID.TabIndex = 596;
		System.Windows.Forms.Label label33 = this.loggerBox;
		System.Drawing.Color backColor3 = System.Drawing.Color.FromArgb(40, 40, 40);
		label33.BackColor = backColor3;
		this.loggerBox.Dock = System.Windows.Forms.DockStyle.Bottom;
		System.Windows.Forms.Label label34 = this.loggerBox;
		System.Drawing.Font font18 = new System.Drawing.Font("Microsoft Sans Serif", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label34.Font = font18;
		System.Windows.Forms.Label label35 = this.loggerBox;
		System.Drawing.Color control10 = System.Drawing.SystemColors.Control;
		label35.ForeColor = control10;
		System.Windows.Forms.Label label36 = this.loggerBox;
		System.Drawing.Point location18 = new System.Drawing.Point(0, 623);
		label36.Location = location18;
		this.loggerBox.Name = "loggerBox";
		System.Windows.Forms.Label label37 = this.loggerBox;
		System.Windows.Forms.Padding padding = new System.Windows.Forms.Padding(0, 5, 0, 5);
		label37.Padding = padding;
		System.Windows.Forms.Label label38 = this.loggerBox;
		System.Drawing.Size size18 = new System.Drawing.Size(1016, 37);
		label38.Size = size18;
		this.loggerBox.TabIndex = 595;
		this.loggerBox.Text = "Victory Templates";
		System.Windows.Forms.Button button13 = this.btn_removeSelected;
		System.Drawing.Color backColor4 = System.Drawing.Color.FromArgb(40, 40, 40);
		button13.BackColor = backColor4;
		this.btn_removeSelected.FlatAppearance.BorderSize = 0;
		this.btn_removeSelected.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button14 = this.btn_removeSelected;
		System.Drawing.Font font19 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button14.Font = font19;
		System.Windows.Forms.Button button15 = this.btn_removeSelected;
		System.Drawing.Color control11 = System.Drawing.SystemColors.Control;
		button15.ForeColor = control11;
		System.Windows.Forms.Button button16 = this.btn_removeSelected;
		System.Drawing.Point location19 = new System.Drawing.Point(25, 556);
		button16.Location = location19;
		this.btn_removeSelected.Name = "btn_removeSelected";
		System.Windows.Forms.Button button17 = this.btn_removeSelected;
		System.Drawing.Size size19 = new System.Drawing.Size(469, 39);
		button17.Size = size19;
		this.btn_removeSelected.TabIndex = 594;
		this.btn_removeSelected.Text = "REMOVE SELECTED";
		this.btn_removeSelected.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button18 = this.btn_removeSelected;
		System.EventHandler value3 = new System.EventHandler(this.btn_removeSelected_Click);
		button18.Click += value3;
		this.label4.AutoSize = true;
		System.Windows.Forms.Label label39 = this.label4;
		System.Drawing.Font font20 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label39.Font = font20;
		System.Windows.Forms.Label label40 = this.label4;
		System.Drawing.Color controlLightLight9 = System.Drawing.SystemColors.ControlLightLight;
		label40.ForeColor = controlLightLight9;
		System.Windows.Forms.Label label41 = this.label4;
		System.Drawing.Point location20 = new System.Drawing.Point(22, 134);
		label41.Location = location20;
		this.label4.Name = "label4";
		System.Windows.Forms.Label label42 = this.label4;
		System.Drawing.Size size20 = new System.Drawing.Size(78, 22);
		label42.Size = size20;
		this.label4.TabIndex = 593;
		this.label4.Text = "Search:";
		System.Windows.Forms.TextBox textBox29 = this.input_searchBox;
		System.Drawing.Font font21 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox29.Font = font21;
		System.Windows.Forms.TextBox textBox30 = this.input_searchBox;
		System.Drawing.Point location21 = new System.Drawing.Point(116, 131);
		textBox30.Location = location21;
		this.input_searchBox.Name = "input_searchBox";
		System.Windows.Forms.TextBox textBox31 = this.input_searchBox;
		System.Drawing.Size size21 = new System.Drawing.Size(378, 29);
		textBox31.Size = size21;
		this.input_searchBox.TabIndex = 592;
		System.Windows.Forms.TextBox textBox32 = this.input_searchBox;
		System.EventHandler value4 = new System.EventHandler(this.input_searchBox_TextChanged);
		textBox32.TextChanged += value4;
		System.Windows.Forms.Button button19 = this.btn_EditSelected;
		System.Drawing.Color backColor5 = System.Drawing.Color.FromArgb(40, 40, 40);
		button19.BackColor = backColor5;
		this.btn_EditSelected.FlatAppearance.BorderSize = 0;
		this.btn_EditSelected.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button20 = this.btn_EditSelected;
		System.Drawing.Font font22 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button20.Font = font22;
		System.Windows.Forms.Button button21 = this.btn_EditSelected;
		System.Drawing.Color control12 = System.Drawing.SystemColors.Control;
		button21.ForeColor = control12;
		System.Windows.Forms.Button button22 = this.btn_EditSelected;
		System.Drawing.Point location22 = new System.Drawing.Point(25, 511);
		button22.Location = location22;
		this.btn_EditSelected.Name = "btn_EditSelected";
		System.Windows.Forms.Button button23 = this.btn_EditSelected;
		System.Drawing.Size size22 = new System.Drawing.Size(469, 39);
		button23.Size = size22;
		this.btn_EditSelected.TabIndex = 591;
		this.btn_EditSelected.Text = "EDIT SELECTED";
		this.btn_EditSelected.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button24 = this.btn_EditSelected;
		System.EventHandler value5 = new System.EventHandler(this.btn_EditSelected_Click);
		button24.Click += value5;
		this.label18.AutoSize = true;
		System.Windows.Forms.Label label43 = this.label18;
		System.Drawing.Font font23 = new System.Drawing.Font("Rockwell Extra Bold", 13.8f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		label43.Font = font23;
		System.Windows.Forms.Label label44 = this.label18;
		System.Drawing.Color steelBlue = System.Drawing.Color.SteelBlue;
		label44.ForeColor = steelBlue;
		System.Windows.Forms.Label label45 = this.label18;
		System.Drawing.Point location23 = new System.Drawing.Point(21, 24);
		label45.Location = location23;
		this.label18.Name = "label18";
		System.Windows.Forms.Label label46 = this.label18;
		System.Drawing.Size size23 = new System.Drawing.Size(337, 27);
		label46.Size = size23;
		this.label18.TabIndex = 590;
		this.label18.Text = "Victory Template Editor";
		System.Windows.Forms.Button button25 = this.btn_LoadGFXList;
		System.Drawing.Color backColor6 = System.Drawing.Color.FromArgb(40, 40, 40);
		button25.BackColor = backColor6;
		this.btn_LoadGFXList.FlatAppearance.BorderSize = 0;
		this.btn_LoadGFXList.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button26 = this.btn_LoadGFXList;
		System.Drawing.Font font24 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button26.Font = font24;
		System.Windows.Forms.Button button27 = this.btn_LoadGFXList;
		System.Drawing.Color control13 = System.Drawing.SystemColors.Control;
		button27.ForeColor = control13;
		System.Windows.Forms.Button button28 = this.btn_LoadGFXList;
		System.Drawing.Point location24 = new System.Drawing.Point(26, 76);
		button28.Location = location24;
		this.btn_LoadGFXList.Name = "btn_LoadGFXList";
		System.Windows.Forms.Button button29 = this.btn_LoadGFXList;
		System.Drawing.Size size24 = new System.Drawing.Size(469, 39);
		button29.Size = size24;
		this.btn_LoadGFXList.TabIndex = 589;
		this.btn_LoadGFXList.Text = "LOAD TEMPLATE LIST";
		this.btn_LoadGFXList.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button30 = this.btn_LoadGFXList;
		System.EventHandler value6 = new System.EventHandler(this.btn_LoadGFXList_Click);
		button30.Click += value6;
		System.Windows.Forms.ListBox listBox = this.list_GFXEntries;
		System.Drawing.Color backColor7 = System.Drawing.Color.FromArgb(60, 60, 60);
		listBox.BackColor = backColor7;
		System.Windows.Forms.ListBox listBox2 = this.list_GFXEntries;
		System.Drawing.Font font25 = new System.Drawing.Font("Rockwell", 10.8f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		listBox2.Font = font25;
		System.Windows.Forms.ListBox listBox3 = this.list_GFXEntries;
		System.Drawing.Color control14 = System.Drawing.SystemColors.Control;
		listBox3.ForeColor = control14;
		this.list_GFXEntries.FormattingEnabled = true;
		this.list_GFXEntries.ItemHeight = 20;
		System.Windows.Forms.ListBox listBox4 = this.list_GFXEntries;
		System.Drawing.Point location25 = new System.Drawing.Point(25, 166);
		listBox4.Location = location25;
		this.list_GFXEntries.Name = "list_GFXEntries";
		this.list_GFXEntries.ScrollAlwaysVisible = true;
		System.Windows.Forms.ListBox listBox5 = this.list_GFXEntries;
		System.Drawing.Size size25 = new System.Drawing.Size(470, 324);
		listBox5.Size = size25;
		this.list_GFXEntries.TabIndex = 588;
		System.Windows.Forms.Button button31 = this.btn_AnimIDList;
		System.Drawing.Color goldenrod = System.Drawing.Color.Goldenrod;
		button31.BackColor = goldenrod;
		this.btn_AnimIDList.FlatAppearance.BorderSize = 0;
		this.btn_AnimIDList.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button32 = this.btn_AnimIDList;
		System.Drawing.Font font26 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button32.Font = font26;
		System.Windows.Forms.Button button33 = this.btn_AnimIDList;
		System.Drawing.Color control15 = System.Drawing.SystemColors.Control;
		button33.ForeColor = control15;
		System.Windows.Forms.Button button34 = this.btn_AnimIDList;
		System.Drawing.Point location26 = new System.Drawing.Point(918, 255);
		button34.Location = location26;
		this.btn_AnimIDList.Name = "btn_AnimIDList";
		System.Windows.Forms.Button button35 = this.btn_AnimIDList;
		System.Drawing.Size size26 = new System.Drawing.Size(71, 29);
		button35.Size = size26;
		this.btn_AnimIDList.TabIndex = 617;
		this.btn_AnimIDList.Text = "LIST";
		this.btn_AnimIDList.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button36 = this.btn_AnimIDList;
		System.EventHandler value7 = new System.EventHandler(this.btn_AnimIDList_Click);
		button36.Click += value7;
		System.Windows.Forms.Button button37 = this.btn_EditMusicList;
		System.Drawing.Color goldenrod2 = System.Drawing.Color.Goldenrod;
		button37.BackColor = goldenrod2;
		this.btn_EditMusicList.FlatAppearance.BorderSize = 0;
		this.btn_EditMusicList.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button38 = this.btn_EditMusicList;
		System.Drawing.Font font27 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button38.Font = font27;
		System.Windows.Forms.Button button39 = this.btn_EditMusicList;
		System.Drawing.Color control16 = System.Drawing.SystemColors.Control;
		button39.ForeColor = control16;
		System.Windows.Forms.Button button40 = this.btn_EditMusicList;
		System.Drawing.Point location27 = new System.Drawing.Point(918, 429);
		button40.Location = location27;
		this.btn_EditMusicList.Name = "btn_EditMusicList";
		System.Windows.Forms.Button button41 = this.btn_EditMusicList;
		System.Drawing.Size size27 = new System.Drawing.Size(71, 29);
		button41.Size = size27;
		this.btn_EditMusicList.TabIndex = 620;
		this.btn_EditMusicList.Text = "LIST";
		this.btn_EditMusicList.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button42 = this.btn_EditMusicList;
		System.EventHandler value8 = new System.EventHandler(this.btn_EditMusicList_Click);
		button42.Click += value8;
		this.label12.AutoSize = true;
		System.Windows.Forms.Label label47 = this.label12;
		System.Drawing.Font font28 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label47.Font = font28;
		System.Windows.Forms.Label label48 = this.label12;
		System.Drawing.Color controlLightLight10 = System.Drawing.SystemColors.ControlLightLight;
		label48.ForeColor = controlLightLight10;
		System.Windows.Forms.Label label49 = this.label12;
		System.Drawing.Point location28 = new System.Drawing.Point(537, 432);
		label49.Location = location28;
		this.label12.Name = "label12";
		System.Windows.Forms.Label label50 = this.label12;
		System.Drawing.Size size28 = new System.Drawing.Size(90, 22);
		label50.Size = size28;
		this.label12.TabIndex = 619;
		this.label12.Text = "Music ID";
		System.Windows.Forms.TextBox textBox33 = this.input_MusicID;
		System.Drawing.Color control17 = System.Drawing.SystemColors.Control;
		textBox33.BackColor = control17;
		System.Windows.Forms.TextBox textBox34 = this.input_MusicID;
		System.Drawing.Font font29 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox34.Font = font29;
		System.Windows.Forms.TextBox textBox35 = this.input_MusicID;
		System.Drawing.Point location29 = new System.Drawing.Point(757, 429);
		textBox35.Location = location29;
		this.input_MusicID.Name = "input_MusicID";
		System.Windows.Forms.TextBox textBox36 = this.input_MusicID;
		System.Drawing.Size size29 = new System.Drawing.Size(155, 29);
		textBox36.Size = size29;
		this.input_MusicID.TabIndex = 618;
		this.label9.AutoSize = true;
		System.Windows.Forms.Label label51 = this.label9;
		System.Drawing.Font font30 = new System.Drawing.Font("Rockwell", 12f, System.Drawing.FontStyle.Regular, System.Drawing.GraphicsUnit.Point, 0);
		label51.Font = font30;
		System.Windows.Forms.Label label52 = this.label9;
		System.Drawing.Color controlLightLight11 = System.Drawing.SystemColors.ControlLightLight;
		label52.ForeColor = controlLightLight11;
		System.Windows.Forms.Label label53 = this.label9;
		System.Drawing.Point location30 = new System.Drawing.Point(537, 397);
		label53.Location = location30;
		this.label9.Name = "label9";
		System.Windows.Forms.Label label54 = this.label9;
		System.Drawing.Size size30 = new System.Drawing.Size(122, 22);
		label54.Size = size30;
		this.label9.TabIndex = 622;
		this.label9.Text = "Double Title";
		System.Windows.Forms.TextBox textBox37 = this.input_doubleTitle;
		System.Drawing.Color control18 = System.Drawing.SystemColors.Control;
		textBox37.BackColor = control18;
		System.Windows.Forms.TextBox textBox38 = this.input_doubleTitle;
		System.Drawing.Font font31 = new System.Drawing.Font("Microsoft YaHei", 10f);
		textBox38.Font = font31;
		System.Windows.Forms.TextBox textBox39 = this.input_doubleTitle;
		System.Drawing.Point location31 = new System.Drawing.Point(757, 394);
		textBox39.Location = location31;
		this.input_doubleTitle.Name = "input_doubleTitle";
		System.Windows.Forms.TextBox textBox40 = this.input_doubleTitle;
		System.Drawing.Size size31 = new System.Drawing.Size(155, 29);
		textBox40.Size = size31;
		this.input_doubleTitle.TabIndex = 621;
		System.Windows.Forms.Button button43 = this.btn_SDB;
		System.Drawing.Color steelBlue2 = System.Drawing.Color.SteelBlue;
		button43.BackColor = steelBlue2;
		this.btn_SDB.FlatAppearance.BorderSize = 0;
		this.btn_SDB.FlatStyle = System.Windows.Forms.FlatStyle.Flat;
		System.Windows.Forms.Button button44 = this.btn_SDB;
		System.Drawing.Font font32 = new System.Drawing.Font("Microsoft YaHei", 10.2f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button44.Font = font32;
		System.Windows.Forms.Button button45 = this.btn_SDB;
		System.Drawing.Color control19 = System.Drawing.SystemColors.Control;
		button45.ForeColor = control19;
		System.Windows.Forms.Button button46 = this.btn_SDB;
		System.Drawing.Point location32 = new System.Drawing.Point(918, 184);
		button46.Location = location32;
		this.btn_SDB.Name = "btn_SDB";
		System.Windows.Forms.Button button47 = this.btn_SDB;
		System.Drawing.Size size32 = new System.Drawing.Size(71, 29);
		button47.Size = size32;
		this.btn_SDB.TabIndex = 668;
		this.btn_SDB.Text = "SDB";
		this.btn_SDB.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button48 = this.btn_SDB;
		System.EventHandler value9 = new System.EventHandler(this.btn_SDB_Click);
		button48.Click += value9;
		System.Windows.Forms.Button button49 = this.button11;
		System.Drawing.Color black = System.Drawing.Color.Black;
		button49.BackColor = black;
		System.Windows.Forms.Button button50 = this.button11;
		System.Drawing.Font font33 = new System.Drawing.Font("Microsoft Sans Serif", 13.8f, System.Drawing.FontStyle.Bold, System.Drawing.GraphicsUnit.Point, 0);
		button50.Font = font33;
		System.Windows.Forms.Button button51 = this.button11;
		System.Drawing.Color controlLightLight12 = System.Drawing.SystemColors.ControlLightLight;
		button51.ForeColor = controlLightLight12;
		System.Windows.Forms.Button button52 = this.button11;
		System.Drawing.Point location33 = new System.Drawing.Point(404, 16);
		button52.Location = location33;
		this.button11.Name = "button11";
		System.Windows.Forms.Button button53 = this.button11;
		System.Drawing.Size size33 = new System.Drawing.Size(47, 42);
		button53.Size = size33;
		this.button11.TabIndex = 670;
		this.button11.Text = "!";
		this.button11.UseVisualStyleBackColor = false;
		System.Windows.Forms.Button button54 = this.button11;
		System.EventHandler value10 = new System.EventHandler(this.button11_Click);
		button54.Click += value10;
		System.Drawing.SizeF sizeF = new System.Drawing.SizeF(8f, 16f);
		base.AutoScaleDimensions = sizeF;
		base.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
		System.Drawing.Color backColor8 = System.Drawing.Color.FromArgb(20, 20, 20);
		this.BackColor = backColor8;
		System.Drawing.Size clientSize = new System.Drawing.Size(1016, 660);
		base.ClientSize = clientSize;
		base.Controls.Add(this.button11);
		base.Controls.Add(this.btn_SDB);
		base.Controls.Add(this.label9);
		base.Controls.Add(this.input_doubleTitle);
		base.Controls.Add(this.btn_EditMusicList);
		base.Controls.Add(this.label12);
		base.Controls.Add(this.input_MusicID);
		base.Controls.Add(this.btn_AnimIDList);
		base.Controls.Add(this.btn_SaveAsNew);
		base.Controls.Add(this.label8);
		base.Controls.Add(this.input_TitleHeel);
		base.Controls.Add(this.label7);
		base.Controls.Add(this.input_TitleFace);
		base.Controls.Add(this.label6);
		base.Controls.Add(this.input_VictoryHeel);
		base.Controls.Add(this.label5);
		base.Controls.Add(this.input_VictoryFace);
		base.Controls.Add(this.label3);
		base.Controls.Add(this.input_EntranceType);
		base.Controls.Add(this.label1);
		base.Controls.Add(this.input_NameSDBID);
		base.Controls.Add(this.label2);
		base.Controls.Add(this.btn_SaveChanges);
		base.Controls.Add(this.label10);
		base.Controls.Add(this.input_templateID);
		base.Controls.Add(this.loggerBox);
		base.Controls.Add(this.btn_removeSelected);
		base.Controls.Add(this.label4);
		base.Controls.Add(this.input_searchBox);
		base.Controls.Add(this.btn_EditSelected);
		base.Controls.Add(this.label18);
		base.Controls.Add(this.btn_LoadGFXList);
		base.Controls.Add(this.list_GFXEntries);
		base.Icon = (System.Drawing.Icon)resources.GetObject("$this.Icon");
		System.Drawing.Size minimumSize = new System.Drawing.Size(1034, 707);
		this.MinimumSize = minimumSize;
		base.Name = "VictoryTemplateEditor";
		base.StartPosition = System.Windows.Forms.FormStartPosition.CenterScreen;
		this.Text = "Victory Template Editor";
		base.ResumeLayout(false);
		base.PerformLayout();
	}

	private unsafe int GetOriginalIndexOfSelectedItem()
	{
		if (list_GFXEntries.SelectedIndex == -1)
		{
			GC.KeepAlive(this);
			return -1;
		}
		int selectedIndex = list_GFXEntries.SelectedIndex;
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

	private unsafe void btn_LoadGFXList_Click(object sender, EventArgs e)
	{
		//IL_000b: Expected I, but got I8
		//IL_042f: Expected I, but got I8
		//IL_00c1: Expected I, but got I8
		marshal_context marshal_context2 = null;
		string text = null;
		uint num = 0u;
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
		<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >.clear((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A));
		<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
		<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
		marshal_context marshal_context3 = new marshal_context();
		try
		{
			marshal_context2 = marshal_context3;
			System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<VictoryTemplate,std::allocator<VictoryTemplate> > obj);
			<Module>.GetAllVictoryTemplates(&obj);
			try
			{
				list_GFXEntries.Items.Clear();
				int num2 = 0;
				if (0uL < (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<VictoryTemplate,std::allocator<VictoryTemplate> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj, 8)) - *(long*)(&obj)) / 88))
				{
					long num3 = 0L;
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj2);
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj3);
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj4);
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj5);
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj6);
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj7);
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj8);
					do
					{
						long num4 = num3 + *(long*)(&obj);
						basic_string<char,std::char_traits<char>,std::allocator<char> >* right;
						if (*(byte*)(num4 + 2) != 0)
						{
							optional<unsigned short>* ptr = (optional<unsigned short>*)num4;
							if (*(byte*)((ulong)(nint)ptr + 2uL) == 0)
							{
								<Module>.std._Throw_bad_optional_access();
								goto IL_0364;
							}
							right = <Module>.std.to_string(&obj2, *(ushort*)ptr);
							try
							{
								num |= 1;
							}
							catch
							{
								//try-fault
								if ((num & 1) != 0)
								{
									num &= 0xFFFFFFFEu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj2);
								}
								throw;
							}
						}
						else
						{
							right = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj3, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_00CNPNBAHC@@));
							try
							{
								try
								{
									num |= 2;
								}
								catch
								{
									//try-fault
									if ((num & 2) != 0)
									{
										num &= 0xFFFFFFFDu;
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj3);
									}
									throw;
								}
							}
							catch
							{
								//try-fault
								if ((num & 1) != 0)
								{
									num &= 0xFFFFFFFEu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj2);
								}
								throw;
							}
						}
						try
						{
							try
							{
								<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj4, right);
							}
							catch
							{
								//try-fault
								if ((num & 2) != 0)
								{
									num &= 0xFFFFFFFDu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj3);
								}
								throw;
							}
							try
							{
								if ((num & 2) != 0)
								{
									num &= 0xFFFFFFFDu;
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
								try
								{
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
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj4);
								throw;
							}
						}
						catch
						{
							//try-fault
							if ((num & 1) != 0)
							{
								num &= 0xFFFFFFFEu;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj2);
							}
							throw;
						}
						try
						{
							if ((num & 1) != 0)
							{
								num &= 0xFFFFFFFEu;
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
							long num5 = num3 + *(long*)(&obj);
							uint guid;
							if (*(byte*)(num5 + 8) == 0)
							{
								guid = 0u;
								goto IL_0210;
							}
							if (*(bool*)(num5 + 4 + 4))
							{
								guid = *(uint*)(num5 + 4);
								goto IL_0210;
							}
							goto end_IL_01c3;
							IL_0210:
							<Module>.GetStringFromSDB(&obj5, sdb, guid);
							try
							{
								basic_string<char,std::char_traits<char>,std::allocator<char> >* left = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj6, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0O@MAPGKNFH@Template?5ID?3?5@), &obj4);
								try
								{
									basic_string<char,std::char_traits<char>,std::allocator<char> >* left2 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj7, left, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_02KEGNLNML@?0?5@));
									try
									{
										<Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj8, left2, &obj5);
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
								try
								{
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
									ListBox.ObjectCollection items = list_GFXEntries.Items;
									string item = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(&obj8);
									items.Add(item);
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj8);
									throw;
								}
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
							goto IL_0324;
							end_IL_01c3:;
						}
						catch
						{
							//try-fault
							<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj4);
							throw;
						}
						goto IL_0364;
						IL_0364:
						try
						{
							<Module>.std._Throw_bad_optional_access();
						}
						catch
						{
							//try-fault
							<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj4);
							throw;
						}
						break;
						IL_0324:
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
						num3 += 88;
					}
					while ((ulong)num2 < (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<VictoryTemplate,std::allocator<VictoryTemplate> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj, 8)) - *(long*)(&obj)) / 88));
				}
				if (System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) == System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)))
				{
					int num6 = 0;
					if (num6 < list_GFXEntries.Items.Count)
					{
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj9);
						do
						{
							ListBox.ObjectCollection items2 = list_GFXEntries.Items;
							int index = num6;
							text = items2[index].ToString();
							<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj9, &text);
							try
							{
								<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >._Emplace_one_at_back<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > const &>((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A), &obj9);
								<Module>.std.vector<int,std::allocator<int> >._Emplace_one_at_back<int const &>((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A), &num6);
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
							num6++;
						}
						while (num6 < list_GFXEntries.Items.Count);
					}
				}
				<Module>.DeleteSDB(sdb);
				sdb = null;
				loggerBox.Text = "Template List Loaded!";
				loggerBox.Refresh();
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj);
				throw;
			}
			<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj);
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
		list_GFXEntries.Items.Clear();
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
						list_GFXEntries.Items.Add(text);
						<Module>.std.vector<int,std::allocator<int> >._Emplace_one_at_back<int const &>(&obj, (int*)(num * 4 + (ulong)System.Runtime.CompilerServices.Unsafe.As<vector<int,std::allocator<int> >, long>(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A)));
					}
					num++;
					num2 += 32;
				}
				while (num < (ulong)(System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)) - System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) >> 5));
			}
			<Module>.std.vector<int,std::allocator<int> >.=((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A), &obj);
			if (list_GFXEntries.Items.Count > 0)
			{
				list_GFXEntries.SelectedIndex = 0;
			}
			else
			{
				list_GFXEntries.SelectedIndex = -1;
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

	private unsafe void btn_EditSelected_Click(object sender, EventArgs e)
	{
		marshal_context marshal_context2 = null;
		uint num = 0u;
		marshal_context marshal_context3 = new marshal_context();
		System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj);
		try
		{
			marshal_context2 = marshal_context3;
			input_templateID.Text = "";
			input_NameSDBID.Text = "";
			input_EntranceType.Text = "";
			input_VictoryFace.Text = "";
			input_VictoryHeel.Text = "";
			input_TitleFace.Text = "";
			input_TitleHeel.Text = "";
			input_doubleTitle.Text = "";
			input_MusicID.Text = "";
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
				if (list_GFXEntries.SelectedIndex != -1)
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj2);
					basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr = marshal_context2.marshal_as<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,System::String>(&obj2, list_GFXEntries.SelectedItem.ToString());
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
					System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<VictoryTemplate,std::allocator<VictoryTemplate> > obj3);
					<Module>.GetAllVictoryTemplates(&obj3);
					try
					{
						ulong num2 = (ulong)GetOriginalIndexOfSelectedItem();
						System.Runtime.CompilerServices.Unsafe.SkipInit(out VictoryTemplate victoryTemplate);
						// IL cpblk instruction
						System.Runtime.CompilerServices.Unsafe.CopyBlock(ref victoryTemplate, (long)(num2 * 88) + *(long*)(&obj3), 88);
						TextBox textBox = input_templateID;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj4);
						string text;
						if (System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 2)) != 0)
						{
							basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj = <Module>.std.to_string(&obj4, *(ushort*)(&victoryTemplate));
							try
							{
								num = 1u;
								text = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj);
							}
							catch
							{
								//try-fault
								if ((num & 1) != 0)
								{
									num &= 0xFFFFFFFEu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj4);
								}
								throw;
							}
						}
						else
						{
							text = "";
						}
						try
						{
							textBox.Text = text;
						}
						catch
						{
							//try-fault
							if ((num & 1) != 0)
							{
								num &= 0xFFFFFFFEu;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj4);
							}
							throw;
						}
						if ((num & 1) != 0)
						{
							num &= 0xFFFFFFFEu;
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
						TextBox textBox2 = input_NameSDBID;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj5);
						string text2;
						if (System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 8)) != 0)
						{
							basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj2 = <Module>.std.to_string(&obj5, System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 4)));
							try
							{
								num |= 2;
								text2 = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj2);
							}
							catch
							{
								//try-fault
								if ((num & 2) != 0)
								{
									num &= 0xFFFFFFFDu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj5);
								}
								throw;
							}
						}
						else
						{
							text2 = "";
						}
						try
						{
							textBox2.Text = text2;
						}
						catch
						{
							//try-fault
							if ((num & 2) != 0)
							{
								num &= 0xFFFFFFFDu;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj5);
							}
							throw;
						}
						if ((num & 2) != 0)
						{
							num &= 0xFFFFFFFDu;
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
						TextBox textBox3 = input_EntranceType;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj6);
						string text3;
						if (System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 13)) != 0)
						{
							basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj3 = <Module>.std.to_string(&obj6, System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 12)));
							try
							{
								num |= 4;
								text3 = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj3);
							}
							catch
							{
								//try-fault
								if ((num & 4) != 0)
								{
									num &= 0xFFFFFFFBu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj6);
								}
								throw;
							}
						}
						else
						{
							text3 = "1";
						}
						try
						{
							textBox3.Text = text3;
						}
						catch
						{
							//try-fault
							if ((num & 4) != 0)
							{
								num &= 0xFFFFFFFBu;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj6);
							}
							throw;
						}
						if ((num & 4) != 0)
						{
							num &= 0xFFFFFFFBu;
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
						TextBox textBox4 = input_VictoryFace;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj7);
						string text4;
						if (System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 36)) != 0)
						{
							basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj4 = <Module>.std.to_string(&obj7, System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 32)));
							try
							{
								num |= 8;
								text4 = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj4);
							}
							catch
							{
								//try-fault
								if ((num & 8) != 0)
								{
									num &= 0xFFFFFFF7u;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj7);
								}
								throw;
							}
						}
						else
						{
							text4 = "";
						}
						try
						{
							textBox4.Text = text4;
						}
						catch
						{
							//try-fault
							if ((num & 8) != 0)
							{
								num &= 0xFFFFFFF7u;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj7);
							}
							throw;
						}
						if ((num & 8) != 0)
						{
							num &= 0xFFFFFFF7u;
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
						TextBox textBox5 = input_VictoryHeel;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj8);
						string text5;
						if (System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 44)) != 0)
						{
							basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj5 = <Module>.std.to_string(&obj8, System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 40)));
							try
							{
								num |= 0x10;
								text5 = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj5);
							}
							catch
							{
								//try-fault
								if ((num & 0x10) != 0)
								{
									num &= 0xFFFFFFEFu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj8);
								}
								throw;
							}
						}
						else
						{
							text5 = "";
						}
						try
						{
							textBox5.Text = text5;
						}
						catch
						{
							//try-fault
							if ((num & 0x10) != 0)
							{
								num &= 0xFFFFFFEFu;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj8);
							}
							throw;
						}
						if ((num & 0x10) != 0)
						{
							num &= 0xFFFFFFEFu;
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
						TextBox textBox6 = input_TitleFace;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj9);
						string text6;
						if (System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 52)) != 0)
						{
							basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj6 = <Module>.std.to_string(&obj9, System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 48)));
							try
							{
								num |= 0x20;
								text6 = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj6);
							}
							catch
							{
								//try-fault
								if ((num & 0x20) != 0)
								{
									num &= 0xFFFFFFDFu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj9);
								}
								throw;
							}
						}
						else
						{
							text6 = "";
						}
						try
						{
							textBox6.Text = text6;
						}
						catch
						{
							//try-fault
							if ((num & 0x20) != 0)
							{
								num &= 0xFFFFFFDFu;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj9);
							}
							throw;
						}
						if ((num & 0x20) != 0)
						{
							num &= 0xFFFFFFDFu;
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
						TextBox textBox7 = input_TitleHeel;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj10);
						string text7;
						if (System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 60)) != 0)
						{
							basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj7 = <Module>.std.to_string(&obj10, System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 56)));
							try
							{
								num |= 0x40;
								text7 = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj7);
							}
							catch
							{
								//try-fault
								if ((num & 0x40) != 0)
								{
									num &= 0xFFFFFFBFu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
								}
								throw;
							}
						}
						else
						{
							text7 = "";
						}
						try
						{
							textBox7.Text = text7;
						}
						catch
						{
							//try-fault
							if ((num & 0x40) != 0)
							{
								num &= 0xFFFFFFBFu;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
							}
							throw;
						}
						if ((num & 0x40) != 0)
						{
							num &= 0xFFFFFFBFu;
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
						TextBox textBox8 = input_doubleTitle;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj11);
						string text8;
						if (System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 68)) != 0)
						{
							basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj8 = <Module>.std.to_string(&obj11, System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 64)));
							try
							{
								num |= 0x80;
								text8 = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj8);
							}
							catch
							{
								//try-fault
								if ((num & 0x80) != 0)
								{
									num &= 0xFFFFFF7Fu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
								}
								throw;
							}
						}
						else
						{
							text8 = "";
						}
						try
						{
							textBox8.Text = text8;
						}
						catch
						{
							//try-fault
							if ((num & 0x80) != 0)
							{
								num &= 0xFFFFFF7Fu;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
							}
							throw;
						}
						if ((num & 0x80) != 0)
						{
							num &= 0xFFFFFF7Fu;
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
						TextBox textBox9 = input_MusicID;
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj12);
						string text9;
						if (System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, byte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 76)) != 0)
						{
							basic_string<char,std::char_traits<char>,std::allocator<char> >* from_obj9 = <Module>.std.to_string(&obj12, System.Runtime.CompilerServices.Unsafe.As<VictoryTemplate, uint>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref victoryTemplate, 72)));
							try
							{
								num |= 0x100;
								text9 = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(from_obj9);
							}
							catch
							{
								//try-fault
								if ((num & 0x100) != 0)
								{
									num &= 0xFFFFFEFFu;
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj12);
								}
								throw;
							}
						}
						else
						{
							text9 = "";
						}
						try
						{
							textBox9.Text = text9;
						}
						catch
						{
							//try-fault
							if ((num & 0x100) != 0)
							{
								num &= 0xFFFFFEFFu;
								<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj12);
							}
							throw;
						}
						if ((num & 0x100) != 0)
						{
							num &= 0xFFFFFEFFu;
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
						loggerBox.Text = "Template Loaded Successfully!";
						loggerBox.Refresh();
						GC.KeepAlive(this);
					}
					catch
					{
						//try-fault
						<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj3);
						throw;
					}
					<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj3);
					goto IL_06f4;
				}
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj);
				throw;
			}
			goto end_IL_000b;
			IL_06f4:
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
			goto IL_0714;
			end_IL_000b:;
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
				loggerBox.Text = "ERROR: You must select a template to edit!";
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
		IL_0714:
		((IDisposable)marshal_context2).Dispose();
	}

	private unsafe void btn_removeSelected_Click(object sender, EventArgs e)
	{
		//IL_00a8: Expected I, but got I8
		marshal_context marshal_context2 = null;
		marshal_context marshal_context3 = new marshal_context();
		try
		{
			marshal_context2 = marshal_context3;
			if (list_GFXEntries.SelectedIndex == -1)
			{
				loggerBox.Text = "ERROR: You must select a template to remove!";
				loggerBox.Refresh();
				GC.KeepAlive(this);
				goto IL_0046;
			}
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		int originalIndexOfSelectedItem;
		try
		{
			originalIndexOfSelectedItem = GetOriginalIndexOfSelectedItem();
			if (originalIndexOfSelectedItem == -1)
			{
				loggerBox.Text = "ERROR: Invalid selection!";
				loggerBox.Refresh();
				GC.KeepAlive(this);
				goto IL_0089;
			}
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		try
		{
			System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<VictoryTemplate,std::allocator<VictoryTemplate> > obj);
			<Module>.GetAllVictoryTemplates(&obj);
			try
			{
				optional<unsigned short>* ptr = (optional<unsigned short>*)((long)originalIndexOfSelectedItem * 88L + *(long*)(&obj));
				if (*(byte*)((ulong)(nint)ptr + 2uL) == 0)
				{
					<Module>.std._Throw_bad_optional_access();
				}
				if (<Module>.RemoveVictoryTemplate(*(ushort*)ptr))
				{
					ListBox.ObjectCollection items = list_GFXEntries.Items;
					int selectedIndex = list_GFXEntries.SelectedIndex;
					items.RemoveAt(selectedIndex);
					loggerBox.Text = "Template removed successfully!";
					loggerBox.Refresh();
					System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj2);
					basic_string<char,std::char_traits<char>,std::allocator<char> >* pThis = &obj2;
					basic_string<char,std::char_traits<char>,std::allocator<char> >* bakeName = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj2, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
					basic_string<char,std::char_traits<char>,std::allocator<char> >* folderInTributeToBake;
					try
					{
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj3);
						basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr2 = &obj3;
						folderInTributeToBake = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj3, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
					}
					catch
					{
						//try-fault
						<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), pThis);
						throw;
					}
					<Module>.TellCakeviewToBake(folderInTributeToBake, bakeName);
				}
				else
				{
					loggerBox.Text = "ERROR: Failed to remove the template!";
					loggerBox.Refresh();
				}
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj);
				throw;
			}
			<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj);
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
		IL_0046:
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_0089:
		((IDisposable)marshal_context2).Dispose();
	}

	private unsafe void btn_SaveChanges_Click(object sender, EventArgs e)
	{
		//IL_00df: Expected I, but got I8
		//IL_0172: Expected I, but got I8
		//IL_0355: Expected I, but got I8
		//IL_07ab: Expected I, but got I8
		//IL_0437: Expected I, but got I8
		marshal_context marshal_context2 = null;
		marshal_context marshal_context3 = null;
		string text = null;
		uint num = 0u;
		marshal_context marshal_context4 = new marshal_context();
		try
		{
			marshal_context2 = marshal_context4;
			if (list_GFXEntries.SelectedIndex == -1)
			{
				loggerBox.Text = "ERROR: You must select a template to save changes!";
				loggerBox.Refresh();
				GC.KeepAlive(this);
				goto IL_004e;
			}
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		int originalIndexOfSelectedItem;
		try
		{
			originalIndexOfSelectedItem = GetOriginalIndexOfSelectedItem();
			if (originalIndexOfSelectedItem == -1)
			{
				loggerBox.Text = "ERROR: Invalid selection!";
				loggerBox.Refresh();
				GC.KeepAlive(this);
				goto IL_0093;
			}
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<VictoryTemplate,std::allocator<VictoryTemplate> > obj);
		void* sdb;
		try
		{
			<Module>.GetAllVictoryTemplates(&obj);
			try
			{
				long num3;
				if (!string.IsNullOrEmpty(input_templateID.Text))
				{
					uint num2 = Convert.ToUInt32(input_templateID.Text);
					num3 = (long)originalIndexOfSelectedItem * 88L;
					<Module>.std.optional<unsigned short>.operator=<unsigned int,0>((optional<unsigned short>*)(*(long*)(&obj) + num3), &num2);
				}
				else
				{
					num3 = (long)originalIndexOfSelectedItem * 88L;
					*(sbyte*)(num3 + *(long*)(&obj) + 2) = 0;
				}
				if (!string.IsNullOrEmpty(input_NameSDBID.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj2);
					*(uint*)(&obj2) = Convert.ToUInt32(input_NameSDBID.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj2, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlockUnaligned(num3 + *(long*)(&obj) + 4, ref obj2, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 4 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_EntranceType.Text))
				{
					uint num4 = Convert.ToUInt32(input_EntranceType.Text);
					<Module>.std.optional<unsigned char>.operator=<unsigned int,0>((optional<unsigned char>*)(num3 + *(long*)(&obj) + 12), &num4);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 12 + 1) = 0;
				}
				if (!string.IsNullOrEmpty(input_VictoryFace.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj3);
					*(uint*)(&obj3) = Convert.ToUInt32(input_VictoryFace.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj3, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 32, ref obj3, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 32 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_VictoryHeel.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj4);
					*(uint*)(&obj4) = Convert.ToUInt32(input_VictoryHeel.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj4, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 40, ref obj4, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 40 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_TitleFace.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj5);
					*(uint*)(&obj5) = Convert.ToUInt32(input_TitleFace.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj5, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 48, ref obj5, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 48 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_TitleHeel.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj6);
					*(uint*)(&obj6) = Convert.ToUInt32(input_TitleHeel.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj6, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 56, ref obj6, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 56 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_doubleTitle.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj7);
					*(uint*)(&obj7) = Convert.ToUInt32(input_doubleTitle.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj7, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 64, ref obj7, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 64 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_MusicID.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj8);
					*(uint*)(&obj8) = Convert.ToUInt32(input_MusicID.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj8, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 72, ref obj8, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 72 + 4) = 0;
				}
				if (<Module>.SaveVictoryTemplate(*(VictoryTemplate*)(*(long*)(&obj) + num3), originalIndexOfSelectedItem))
				{
					sdb = null;
					<Module>.GetSDB(&sdb);
					if (<Module>.isSDBPresent(sdb))
					{
						goto IL_03c7;
					}
					MessageBox.Show("Failed to find your SDB file!\n\nMake sure your SDB file is in your BakeMe/Sdb folder and it matches your chosen language!\n", "Hold up!", MessageBoxButtons.OK, MessageBoxIcon.Asterisk);
					loggerBox.Text = "FAILED! Can't find your SDB!";
					loggerBox.Refresh();
					GC.KeepAlive(this);
					goto IL_03ab;
				}
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj);
				throw;
			}
			goto end_IL_009f;
			IL_03ab:
			<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj);
			goto IL_03bb;
			end_IL_009f:;
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
				loggerBox.Text = "ERROR: Failed to save changes!";
				loggerBox.Refresh();
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj);
				throw;
			}
			<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj);
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
		IL_004e:
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_03c7:
		try
		{
			try
			{
				<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >.clear((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A));
				<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
				<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
				marshal_context marshal_context5 = new marshal_context();
				try
				{
					marshal_context3 = marshal_context5;
					System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<VictoryTemplate,std::allocator<VictoryTemplate> > obj9);
					<Module>.GetAllVictoryTemplates(&obj9);
					try
					{
						list_GFXEntries.Items.Clear();
						int num5 = 0;
						if (0uL < (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<VictoryTemplate,std::allocator<VictoryTemplate> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj9, 8)) - *(long*)(&obj9)) / 88))
						{
							long num6 = 0L;
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj10);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj11);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj12);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj13);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj14);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj15);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj16);
							do
							{
								long num7 = num6 + *(long*)(&obj9);
								basic_string<char,std::char_traits<char>,std::allocator<char> >* right;
								if (*(byte*)(num7 + 2) != 0)
								{
									optional<unsigned short>* ptr = (optional<unsigned short>*)num7;
									if (*(byte*)((ulong)(nint)ptr + 2uL) == 0)
									{
										<Module>.std._Throw_bad_optional_access();
										goto IL_06de;
									}
									right = <Module>.std.to_string(&obj10, *(ushort*)ptr);
									try
									{
										num |= 1;
									}
									catch
									{
										//try-fault
										if ((num & 1) != 0)
										{
											num &= 0xFFFFFFFEu;
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
										}
										throw;
									}
								}
								else
								{
									right = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj11, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_00CNPNBAHC@@));
									try
									{
										try
										{
											num |= 2;
										}
										catch
										{
											//try-fault
											if ((num & 2) != 0)
											{
												num &= 0xFFFFFFFDu;
												<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
											}
											throw;
										}
									}
									catch
									{
										//try-fault
										if ((num & 1) != 0)
										{
											num &= 0xFFFFFFFEu;
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
										}
										throw;
									}
								}
								try
								{
									try
									{
										<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj12, right);
									}
									catch
									{
										//try-fault
										if ((num & 2) != 0)
										{
											num &= 0xFFFFFFFDu;
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
										}
										throw;
									}
									try
									{
										if ((num & 2) != 0)
										{
											num &= 0xFFFFFFFDu;
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
										try
										{
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
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj12);
										throw;
									}
								}
								catch
								{
									//try-fault
									if ((num & 1) != 0)
									{
										num &= 0xFFFFFFFEu;
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
									}
									throw;
								}
								try
								{
									if ((num & 1) != 0)
									{
										num &= 0xFFFFFFFEu;
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
									long num8 = num6 + *(long*)(&obj9);
									uint guid;
									if (*(byte*)(num8 + 8) == 0)
									{
										guid = 0u;
										goto IL_0587;
									}
									if (*(bool*)(num8 + 4 + 4))
									{
										guid = *(uint*)(num8 + 4);
										goto IL_0587;
									}
									goto end_IL_0539;
									IL_0587:
									<Module>.GetStringFromSDB(&obj13, sdb, guid);
									try
									{
										basic_string<char,std::char_traits<char>,std::allocator<char> >* left = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj14, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0O@MAPGKNFH@Template?5ID?3?5@), &obj12);
										try
										{
											basic_string<char,std::char_traits<char>,std::allocator<char> >* left2 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj15, left, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_02KEGNLNML@?0?5@));
											try
											{
												<Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj16, left2, &obj13);
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
												<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj16);
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
											ListBox.ObjectCollection items = list_GFXEntries.Items;
											string item = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(&obj16);
											items.Add(item);
										}
										catch
										{
											//try-fault
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj16);
											throw;
										}
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
									goto IL_069c;
									end_IL_0539:;
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj12);
									throw;
								}
								goto IL_06de;
								IL_06de:
								try
								{
									<Module>.std._Throw_bad_optional_access();
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj12);
									throw;
								}
								break;
								IL_069c:
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
								num5++;
								num6 += 88;
							}
							while ((ulong)num5 < (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<VictoryTemplate,std::allocator<VictoryTemplate> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj9, 8)) - *(long*)(&obj9)) / 88));
						}
						if (System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) == System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)))
						{
							int num9 = 0;
							if (num9 < list_GFXEntries.Items.Count)
							{
								System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj17);
								do
								{
									ListBox.ObjectCollection items2 = list_GFXEntries.Items;
									int index = num9;
									text = items2[index].ToString();
									<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj17, &text);
									try
									{
										<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >._Emplace_one_at_back<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > const &>((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A), &obj17);
										<Module>.std.vector<int,std::allocator<int> >._Emplace_one_at_back<int const &>((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A), &num9);
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj17);
										throw;
									}
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
									num9++;
								}
								while (num9 < list_GFXEntries.Items.Count);
							}
						}
						<Module>.DeleteSDB(sdb);
						sdb = null;
						loggerBox.Text = "Changes saved successfully!";
						loggerBox.Refresh();
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj18);
						basic_string<char,std::char_traits<char>,std::allocator<char> >* pThis = &obj18;
						basic_string<char,std::char_traits<char>,std::allocator<char> >* bakeName = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj18, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
						basic_string<char,std::char_traits<char>,std::allocator<char> >* folderInTributeToBake;
						try
						{
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj19);
							basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr2 = &obj19;
							folderInTributeToBake = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj19, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
						}
						catch
						{
							//try-fault
							<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), pThis);
							throw;
						}
						<Module>.TellCakeviewToBake(folderInTributeToBake, bakeName);
						GC.KeepAlive(this);
					}
					catch
					{
						//try-fault
						<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj9);
						throw;
					}
					<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj9);
				}
				catch
				{
					//try-fault
					((IDisposable)marshal_context3).Dispose();
					throw;
				}
				((IDisposable)marshal_context3).Dispose();
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj);
				throw;
			}
			<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj);
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_0093:
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_03bb:
		((IDisposable)marshal_context2).Dispose();
	}

	private unsafe void btn_SaveAsNew_Click(object sender, EventArgs e)
	{
		//IL_00df: Expected I, but got I8
		//IL_0172: Expected I, but got I8
		//IL_0353: Expected I, but got I8
		//IL_07a9: Expected I, but got I8
		//IL_0435: Expected I, but got I8
		marshal_context marshal_context2 = null;
		marshal_context marshal_context3 = null;
		string text = null;
		uint num = 0u;
		marshal_context marshal_context4 = new marshal_context();
		try
		{
			marshal_context2 = marshal_context4;
			if (list_GFXEntries.SelectedIndex == -1)
			{
				loggerBox.Text = "ERROR: You must select a template to save as new!";
				loggerBox.Refresh();
				GC.KeepAlive(this);
				goto IL_004e;
			}
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		int originalIndexOfSelectedItem;
		try
		{
			originalIndexOfSelectedItem = GetOriginalIndexOfSelectedItem();
			if (originalIndexOfSelectedItem == -1)
			{
				loggerBox.Text = "ERROR: Invalid selection!";
				loggerBox.Refresh();
				GC.KeepAlive(this);
				goto IL_0093;
			}
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<VictoryTemplate,std::allocator<VictoryTemplate> > obj);
		void* sdb;
		try
		{
			<Module>.GetAllVictoryTemplates(&obj);
			try
			{
				long num3;
				if (!string.IsNullOrEmpty(input_templateID.Text))
				{
					uint num2 = Convert.ToUInt32(input_templateID.Text);
					num3 = (long)originalIndexOfSelectedItem * 88L;
					<Module>.std.optional<unsigned short>.operator=<unsigned int,0>((optional<unsigned short>*)(*(long*)(&obj) + num3), &num2);
				}
				else
				{
					num3 = (long)originalIndexOfSelectedItem * 88L;
					*(sbyte*)(num3 + *(long*)(&obj) + 2) = 0;
				}
				if (!string.IsNullOrEmpty(input_NameSDBID.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj2);
					*(uint*)(&obj2) = Convert.ToUInt32(input_NameSDBID.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj2, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlockUnaligned(num3 + *(long*)(&obj) + 4, ref obj2, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 4 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_EntranceType.Text))
				{
					uint num4 = Convert.ToUInt32(input_EntranceType.Text);
					<Module>.std.optional<unsigned char>.operator=<unsigned int,0>((optional<unsigned char>*)(num3 + *(long*)(&obj) + 12), &num4);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 12 + 1) = 0;
				}
				if (!string.IsNullOrEmpty(input_VictoryFace.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj3);
					*(uint*)(&obj3) = Convert.ToUInt32(input_VictoryFace.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj3, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 32, ref obj3, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 32 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_VictoryHeel.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj4);
					*(uint*)(&obj4) = Convert.ToUInt32(input_VictoryHeel.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj4, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 40, ref obj4, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 40 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_TitleFace.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj5);
					*(uint*)(&obj5) = Convert.ToUInt32(input_TitleFace.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj5, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 48, ref obj5, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 48 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_TitleHeel.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj6);
					*(uint*)(&obj6) = Convert.ToUInt32(input_TitleHeel.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj6, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 56, ref obj6, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 56 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_doubleTitle.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj7);
					*(uint*)(&obj7) = Convert.ToUInt32(input_doubleTitle.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj7, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 64, ref obj7, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 64 + 4) = 0;
				}
				if (!string.IsNullOrEmpty(input_MusicID.Text))
				{
					System.Runtime.CompilerServices.Unsafe.SkipInit(out optional<unsigned int> obj8);
					*(uint*)(&obj8) = Convert.ToUInt32(input_MusicID.Text);
					System.Runtime.CompilerServices.Unsafe.As<optional<unsigned int>, sbyte>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj8, 4)) = 1;
					// IL cpblk instruction
					System.Runtime.CompilerServices.Unsafe.CopyBlock(num3 + *(long*)(&obj) + 72, ref obj8, 8);
				}
				else
				{
					*(sbyte*)(num3 + *(long*)(&obj) + 72 + 4) = 0;
				}
				if (<Module>.CreateVictoryTemplate(*(VictoryTemplate*)(*(long*)(&obj) + num3)))
				{
					sdb = null;
					<Module>.GetSDB(&sdb);
					if (<Module>.isSDBPresent(sdb))
					{
						goto IL_03c5;
					}
					MessageBox.Show("Failed to find your SDB file!\n\nMake sure your SDB file is in your BakeMe/Sdb folder and it matches your chosen language!\n", "Hold up!", MessageBoxButtons.OK, MessageBoxIcon.Asterisk);
					loggerBox.Text = "FAILED! Can't find your SDB!";
					loggerBox.Refresh();
					GC.KeepAlive(this);
					goto IL_03a9;
				}
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj);
				throw;
			}
			goto end_IL_009f;
			IL_03a9:
			<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj);
			goto IL_03b9;
			end_IL_009f:;
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		try
		{
			<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj);
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_004e:
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_03c5:
		try
		{
			try
			{
				<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >.clear((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A));
				<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
				<Module>.std.vector<int,std::allocator<int> >.clear((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?FilteredProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A));
				marshal_context marshal_context5 = new marshal_context();
				try
				{
					marshal_context3 = marshal_context5;
					System.Runtime.CompilerServices.Unsafe.SkipInit(out vector<VictoryTemplate,std::allocator<VictoryTemplate> > obj9);
					<Module>.GetAllVictoryTemplates(&obj9);
					try
					{
						list_GFXEntries.Items.Clear();
						int num5 = 0;
						if (0uL < (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<VictoryTemplate,std::allocator<VictoryTemplate> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj9, 8)) - *(long*)(&obj9)) / 88))
						{
							long num6 = 0L;
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj10);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj11);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj12);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj13);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj14);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj15);
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj16);
							do
							{
								long num7 = num6 + *(long*)(&obj9);
								basic_string<char,std::char_traits<char>,std::allocator<char> >* right;
								if (*(byte*)(num7 + 2) != 0)
								{
									optional<unsigned short>* ptr = (optional<unsigned short>*)num7;
									if (*(byte*)((ulong)(nint)ptr + 2uL) == 0)
									{
										<Module>.std._Throw_bad_optional_access();
										goto IL_06dc;
									}
									right = <Module>.std.to_string(&obj10, *(ushort*)ptr);
									try
									{
										num |= 1;
									}
									catch
									{
										//try-fault
										if ((num & 1) != 0)
										{
											num &= 0xFFFFFFFEu;
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
										}
										throw;
									}
								}
								else
								{
									right = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj11, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_00CNPNBAHC@@));
									try
									{
										try
										{
											num |= 2;
										}
										catch
										{
											//try-fault
											if ((num & 2) != 0)
											{
												num &= 0xFFFFFFFDu;
												<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
											}
											throw;
										}
									}
									catch
									{
										//try-fault
										if ((num & 1) != 0)
										{
											num &= 0xFFFFFFFEu;
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
										}
										throw;
									}
								}
								try
								{
									try
									{
										<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj12, right);
									}
									catch
									{
										//try-fault
										if ((num & 2) != 0)
										{
											num &= 0xFFFFFFFDu;
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj11);
										}
										throw;
									}
									try
									{
										if ((num & 2) != 0)
										{
											num &= 0xFFFFFFFDu;
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
										try
										{
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
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj12);
										throw;
									}
								}
								catch
								{
									//try-fault
									if ((num & 1) != 0)
									{
										num &= 0xFFFFFFFEu;
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj10);
									}
									throw;
								}
								try
								{
									if ((num & 1) != 0)
									{
										num &= 0xFFFFFFFEu;
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
									long num8 = num6 + *(long*)(&obj9);
									uint guid;
									if (*(byte*)(num8 + 8) == 0)
									{
										guid = 0u;
										goto IL_0585;
									}
									if (*(bool*)(num8 + 4 + 4))
									{
										guid = *(uint*)(num8 + 4);
										goto IL_0585;
									}
									goto end_IL_0537;
									IL_0585:
									<Module>.GetStringFromSDB(&obj13, sdb, guid);
									try
									{
										basic_string<char,std::char_traits<char>,std::allocator<char> >* left = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj14, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_0O@MAPGKNFH@Template?5ID?3?5@), &obj12);
										try
										{
											basic_string<char,std::char_traits<char>,std::allocator<char> >* left2 = <Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj15, left, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_02KEGNLNML@?0?5@));
											try
											{
												<Module>.std.operator+<char,struct std::char_traits<char>,class std::allocator<char> >(&obj16, left2, &obj13);
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
												<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj16);
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
											ListBox.ObjectCollection items = list_GFXEntries.Items;
											string item = <Module>.msclr.interop.marshal_as<class System::String ^,class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > >(&obj16);
											items.Add(item);
										}
										catch
										{
											//try-fault
											<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj16);
											throw;
										}
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
									goto IL_069a;
									end_IL_0537:;
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj12);
									throw;
								}
								goto IL_06dc;
								IL_06dc:
								try
								{
									<Module>.std._Throw_bad_optional_access();
								}
								catch
								{
									//try-fault
									<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj12);
									throw;
								}
								break;
								IL_069a:
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
								num5++;
								num6 += 88;
							}
							while ((ulong)num5 < (ulong)((System.Runtime.CompilerServices.Unsafe.As<vector<VictoryTemplate,std::allocator<VictoryTemplate> >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref obj9, 8)) - *(long*)(&obj9)) / 88));
						}
						if (System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A) == System.Runtime.CompilerServices.Unsafe.As<vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >, long>(ref System.Runtime.CompilerServices.Unsafe.AddByteOffset(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A, 8)))
						{
							int num9 = 0;
							if (num9 < list_GFXEntries.Items.Count)
							{
								System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj17);
								do
								{
									ListBox.ObjectCollection items2 = list_GFXEntries.Items;
									int index = num9;
									text = items2[index].ToString();
									<Module>.msclr.interop.marshal_as<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> >,class System::String ^>(&obj17, &text);
									try
									{
										<Module>.std.vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >._Emplace_one_at_back<class std::basic_string<char,struct std::char_traits<char>,class std::allocator<char> > const &>((vector<std::basic_string<char,std::char_traits<char>,std::allocator<char> >,std::allocator<std::basic_string<char,std::char_traits<char>,std::allocator<char> > > >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileItems@Tribute_StaticProperties@@2V?$vector@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@V?$allocator@V?$basic_string@DU?$char_traits@D@std@@V?$allocator@D@2@@std@@@2@@std@@A), &obj17);
										<Module>.std.vector<int,std::allocator<int> >._Emplace_one_at_back<int const &>((vector<int,std::allocator<int> >*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.?OriginalProfileIndices@Tribute_StaticProperties@@2V?$vector@HV?$allocator@H@std@@@std@@A), &num9);
									}
									catch
									{
										//try-fault
										<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), &obj17);
										throw;
									}
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
									num9++;
								}
								while (num9 < list_GFXEntries.Items.Count);
							}
						}
						<Module>.DeleteSDB(sdb);
						sdb = null;
						loggerBox.Text = "New template saved successfully!";
						loggerBox.Refresh();
						System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj18);
						basic_string<char,std::char_traits<char>,std::allocator<char> >* pThis = &obj18;
						basic_string<char,std::char_traits<char>,std::allocator<char> >* bakeName = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj18, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
						basic_string<char,std::char_traits<char>,std::allocator<char> >* folderInTributeToBake;
						try
						{
							System.Runtime.CompilerServices.Unsafe.SkipInit(out basic_string<char,std::char_traits<char>,std::allocator<char> > obj19);
							basic_string<char,std::char_traits<char>,std::allocator<char> >* ptr2 = &obj19;
							folderInTributeToBake = <Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{ctor}(&obj19, (sbyte*)System.Runtime.CompilerServices.Unsafe.AsPointer(ref <Module>.??_C@_06PAHNFIDC@BakeMe@));
						}
						catch
						{
							//try-fault
							<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<basic_string<char,std::char_traits<char>,std::allocator<char> >*, void>)(&<Module>.std.basic_string<char,std::char_traits<char>,std::allocator<char> >.{dtor}), pThis);
							throw;
						}
						<Module>.TellCakeviewToBake(folderInTributeToBake, bakeName);
						GC.KeepAlive(this);
					}
					catch
					{
						//try-fault
						<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj9);
						throw;
					}
					<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj9);
				}
				catch
				{
					//try-fault
					((IDisposable)marshal_context3).Dispose();
					throw;
				}
				((IDisposable)marshal_context3).Dispose();
			}
			catch
			{
				//try-fault
				<Module>.___CxxCallUnwindDtor((delegate*<void*, void>)(delegate*<vector<VictoryTemplate,std::allocator<VictoryTemplate> >*, void>)(&<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >.{dtor}), &obj);
				throw;
			}
			<Module>.std.vector<VictoryTemplate,std::allocator<VictoryTemplate> >._Tidy(&obj);
		}
		catch
		{
			//try-fault
			((IDisposable)marshal_context2).Dispose();
			throw;
		}
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_0093:
		((IDisposable)marshal_context2).Dispose();
		return;
		IL_03b9:
		((IDisposable)marshal_context2).Dispose();
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

	private void btn_EditMusicList_Click(object sender, EventArgs e)
	{
		new EditMusic().ShowDialog();
		btn_LoadGFXList_Click(null, null);
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

	private void button11_Click(object sender, EventArgs e)
	{
		MessageBox.Show("When making changes in this window, it is best to give a unique ID and save as new, which will make a copy rather than editing the vanilla entries. This will mean your entries will surive a merge later on!", "Victory Templates Advice!", MessageBoxButtons.OK, MessageBoxIcon.Asterisk);
		GC.KeepAlive(this);
	}

	[HandleProcessCorruptedStateExceptions]
	protected override void Dispose([MarshalAs(UnmanagedType.U1)] bool A_0)
	{
		if (A_0)
		{
			try
			{
				~VictoryTemplateEditor();
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
