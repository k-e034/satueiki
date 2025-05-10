# coding: utf-8
"""
撮影記 – 写真管理ツール (roll 対応版)
------------------------------------------------------------
* 画像ファイル名のアンダースコア("_")より前を **roll ID** とみなし、
  - JSON に `roll` キーを保持（既存データに無ければロード時に自動付与）
  - GUI 左リストに Roll 列を追加
  - 詳細フォームに Roll を表示（ユーザー編集可能）
* Roll ごとの絞り込み機能
  - 左上に Combobox を配置し、選択 roll だけ表示 / "すべて" を選択で解除
* HTML 生成は既存ボタンのまま (generatePhotoPages.js が roll を解釈)

依存: Pillow
"""
import os, json, shutil, re, subprocess
from datetime import datetime
from pathlib import Path
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk

# ------------------------------------------------------------
PROJECT_DIR = Path(__file__).resolve().parent
PHOTOS_JSON = PROJECT_DIR / "data" / "photos.json"
PHOTOS_DIR  = PROJECT_DIR / "images" / "photos"
GENERATE_JS = PROJECT_DIR / "generatePhotoPages.js"

# ------------------------------------------------------------

def get_roll_id(img_path: str) -> str:
    """ファイル名の先頭～アンダースコア前を roll ID とする"""
    if not img_path:
        return "misc"
    return Path(img_path).name.split("_")[0] if "_" in Path(img_path).name else "misc"

# ------------------------------------------------------------
class PhotoManager:
    def __init__(self):
        self.photos = []
        self.load_json()

    # ---------- data io ---------------------------------------------------
    def load_json(self):
        try:
            PHOTOS_JSON.parent.mkdir(parents=True, exist_ok=True)
            if PHOTOS_JSON.exists():
                with open(PHOTOS_JSON, "r", encoding="utf-8") as f:
                    data = json.load(f)
                if isinstance(data, list):
                    self.photos = data
                else:
                    self.photos = data.get("photos", [])
            else:
                self.photos = []
            # roll を埋める / page を補完
            for p in self.photos:
                if "roll" not in p or not p["roll"]:
                    p["roll"] = get_roll_id(p.get("image", ""))
                if not p.get("page"):
                    pid = p.get("id", 0)
                    p["page"] = f"photo{pid}.html"
                # ID が文字列になっている場合は整数に変換
                if isinstance(p.get("id"), str):
                    try:
                        p["id"] = int(p["id"])
                    except ValueError:
                        p["id"] = self.next_id()
        except Exception as e:
            messagebox.showerror("エラー", f"JSONファイルの読み込み中にエラーが発生しました: {str(e)}")
            self.photos = []

    def save_json(self):
        try:
            self.photos.sort(key=lambda x: int(x.get("id", 0)))
            with open(PHOTOS_JSON, "w", encoding="utf-8") as f:
                json.dump({"photos": self.photos}, f, ensure_ascii=False, indent=2)
            return True
        except Exception as e:
            messagebox.showerror("エラー", f"JSONファイルの保存中にエラーが発生しました: {str(e)}")
            return False

    # ---------- CRUD helpers ---------------------------------------------
    def next_id(self) -> int:
        if not self.photos:
            return 1
        return max((int(p.get("id", 0)) for p in self.photos), default=0) + 1

    def add_photo_entry(self, img_filename: str):
        pid = self.next_id()
        now = datetime.now()
        date_str = now.strftime("%Y-%m-%d")
        date_disp = now.strftime("%Y年%m月%d日")
        roll_id = get_roll_id(img_filename)
        self.photos.append({
            "id"         : pid,
            "title"      : Path(img_filename).stem,
            "description": ["写真の説明を入力してください"],
            "image"      : f"images/photos/{img_filename}",
            "page"       : f"photo{pid}.html",
            "date"       : date_str,
            "dateDisplay": date_disp,
            "location"   : "",
            "camera"     : "",
            "lens"       : "",
            "film"       : "",
            "tags"       : [],
            "roll"       : roll_id,
        })

    def get_all_rolls(self):
        """全てのロールIDを取得する"""
        rolls = set()
        for p in self.photos:
            roll = p.get("roll", "misc")
            if roll:
                rolls.add(roll)
        return sorted(list(rolls))

# ------------------------------------------------------------
class PhotoManagerGUI:
    def __init__(self, root: tk.Tk):
        self.root = root
        root.title("撮影記 – 写真管理ツール (Roll対応)")
        root.geometry("1280x800")
        self.pm = PhotoManager()
        self.tk_img = None  # 画像参照を保持する変数
        self.build_ui()
        self.refresh_tree()

    # ---------- UI builders ----------------------------------------------
    def build_ui(self):
        self.paned = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        self.paned.pack(fill=tk.BOTH, expand=True)

        self.left = ttk.Frame(self.paned, width=320)
        self.paned.add(self.left, weight=1)

        self.right = ttk.Frame(self.paned)
        self.paned.add(self.right, weight=2)

        self.build_left()
        self.build_right()
        self.build_bottom()

    def build_left(self):
        ttk.Button(self.left, text="写真を追加", command=self.on_add_photos).pack(fill=tk.X, pady=4)

        ttk.Label(self.left, text="ロールで絞り込み:").pack(anchor=tk.W)
        self.roll_var = tk.StringVar(value="すべて")
        self.roll_combo = ttk.Combobox(self.left, textvariable=self.roll_var, state="readonly")
        self.roll_combo.pack(fill=tk.X, pady=2)
        self.roll_combo.bind("<<ComboboxSelected>>", lambda e: self.refresh_tree())

        columns = ("id", "roll", "title")
        self.tree = ttk.Treeview(self.left, columns=columns, show="headings")
        self.tree.heading("id", text="ID")
        self.tree.heading("roll", text="Roll")
        self.tree.heading("title", text="タイトル")
        self.tree.column("id", width=50, anchor=tk.CENTER)
        self.tree.column("roll", width=90, anchor=tk.CENTER)
        self.tree.column("title", width=160)
        self.tree.pack(fill=tk.BOTH, expand=True)
        self.tree.bind("<<TreeviewSelect>>", self.on_tree_select)

        scr = ttk.Scrollbar(self.left, orient=tk.VERTICAL, command=self.tree.yview)
        scr.pack(side=tk.RIGHT, fill=tk.Y)
        self.tree.configure(yscrollcommand=scr.set)

    def build_right(self):
        self.preview_label = ttk.Label(self.right, text="プレビュー")
        self.preview_label.pack(anchor=tk.W)
        self.preview_img_label = ttk.Label(self.right)
        self.preview_img_label.pack(pady=4)

        # スクロール可能フレーム
        canvas = tk.Canvas(self.right)
        scrollbar = ttk.Scrollbar(self.right, orient=tk.VERTICAL, command=canvas.yview)
        scrollable_frame = ttk.Frame(canvas)
        
        scrollable_frame.bind(
            "<Configure>",
            lambda e: canvas.configure(scrollregion=canvas.bbox("all"))
        )

        canvas.create_window((0, 0), window=scrollable_frame, anchor=tk.NW)
        canvas.configure(yscrollcommand=scrollbar.set)

        canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True, padx=8)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)

        f = scrollable_frame

        self.vars = {k: tk.StringVar() for k in (
            "id","roll","title","image","page","date","dateDisplay","location","camera","lens","film","tags")}

        def add_row(r, label, key, editable=True):
            ttk.Label(f, text=label).grid(row=r, column=0, sticky=tk.W, pady=2)
            if key == "roll" and editable:
                # ロール用のCombobox
                combo = ttk.Combobox(f, textvariable=self.vars[key], width=50)
                combo.grid(row=r, column=1, sticky=tk.W)
                combo.bind("<FocusIn>", self.on_roll_combobox_focus)
                combo.bind("<Return>", lambda e: combo.selection_clear())  # 新規入力時の処理
                return combo
            else:
                ent = ttk.Entry(f, textvariable=self.vars[key], width=50)
                if not editable:
                    ent.config(state="readonly")
                ent.grid(row=r, column=1, sticky=tk.W)
                return ent

        row = 0
        add_row(row, "ID", "id", editable=False); row+=1
        self.roll_combo_widget = add_row(row, "Roll", "roll", editable=True); row+=1
        add_row(row, "タイトル", "title"); row+=1
        add_row(row, "画像パス", "image", editable=False); row+=1
        add_row(row, "ページ", "page"); row+=1
        add_row(row, "日付", "date"); row+=1
        add_row(row, "表示用日付", "dateDisplay"); row+=1
        add_row(row, "場所", "location"); row+=1
        add_row(row, "カメラ", "camera"); row+=1
        add_row(row, "レンズ", "lens"); row+=1
        add_row(row, "フィルム", "film"); row+=1
        ttk.Label(f, text="タグ(,区切り)").grid(row=row, column=0, sticky=tk.W, pady=2)
        ttk.Entry(f, textvariable=self.vars["tags"], width=50).grid(row=row, column=1, sticky=tk.W); row+=1
        ttk.Label(f, text="説明 (複数行)").grid(row=row, column=0, sticky=tk.W, pady=2)
        self.desc_text = tk.Text(f, width=50, height=6)
        self.desc_text.grid(row=row, column=1, sticky=tk.W); row+=1

        # よく使うタグのボタン
        tags_btn_frame = ttk.Frame(f)
        tags_btn_frame.grid(row=row, column=1, sticky=tk.W, pady=2)
        
        common_tags = [
            ("2025-03", "2025年3月"), ("tokyo", "東京都"), ("mono", "モノクロ"),
            ("nikon-f70d", "Nikon F70D"), ("snap", "スナップ")
        ]
        
        for i, (tag, label) in enumerate(common_tags):
            btn = ttk.Button(tags_btn_frame, text=label, 
                           command=lambda t=tag: self.add_tag(t))
            btn.grid(row=0, column=i, padx=2)

    def build_bottom(self):
        bar = ttk.Frame(self.root)
        bar.pack(fill=tk.X, padx=8, pady=4)
        ttk.Button(bar, text="変更を保存", command=self.on_save).pack(side=tk.LEFT, padx=4)
        ttk.Button(bar, text="削除", command=self.on_delete).pack(side=tk.LEFT, padx=4)
        ttk.Button(bar, text="JSON保存", command=self.on_save_json).pack(side=tk.RIGHT, padx=4)
        ttk.Button(bar, text="HTML生成", command=self.on_generate).pack(side=tk.RIGHT, padx=4)

    def on_roll_combobox_focus(self, event):
        """ロールコンボボックスにフォーカスが入った時に全てのロールを表示する"""
        rolls = self.pm.get_all_rolls()
        if rolls:
            self.roll_combo_widget['values'] = rolls

    def refresh_tree(self):
        sel_roll = self.roll_var.get()
        rolls = self.pm.get_all_rolls()
        self.roll_combo["values"] = ["すべて"] + rolls
        if sel_roll not in self.roll_combo["values"]:
            self.roll_var.set("すべて")
            sel_roll = "すべて"
        
        for i in self.tree.get_children():
            self.tree.delete(i)
        for p in self.pm.photos:
            roll = p.get("roll", "misc")
            if sel_roll != "すべて" and roll != sel_roll:
                continue
            self.tree.insert("", tk.END, values=(p.get("id"), roll, p.get("title")))

    def on_tree_select(self, _):
        sel = self.tree.selection()
        if not sel: return
        values = self.tree.item(sel[0], "values")
        if not values: return
        try:
            pid = int(values[0])
        except (ValueError, IndexError):
            return
        photo = next((p for p in self.pm.photos if int(p.get("id", 0)) == pid), None)
        if not photo: return
        
        for k in self.vars:
            value = photo.get(k, "")
            if k == "tags" and isinstance(value, list):
                value = ", ".join(value)
            self.vars[k].set(str(value))
            
        self.desc_text.delete("1.0", tk.END)
        desc = photo.get("description", [])
        if isinstance(desc, list):
            self.desc_text.insert(tk.END, "\n".join(desc))
        else:
            self.desc_text.insert(tk.END, str(desc))
        self.show_preview(photo.get("image", ""))

    def show_preview(self, rel_path: str):
        try:
            if not rel_path:
                self.preview_img_label.configure(image="")
                return
                
            full = PROJECT_DIR / rel_path
            if full.exists():
                img = Image.open(full)
                w = 320; ratio = w / img.width; h = int(img.height * ratio)
                img = img.resize((w, h), Image.LANCZOS)
                self.tk_img = ImageTk.PhotoImage(img)
                self.preview_img_label.configure(image=self.tk_img)
            else:
                self.preview_img_label.configure(image="")
        except Exception as e:
            self.preview_img_label.configure(image="")
            print(f"プレビューエラー: {e}")

    def on_add_photos(self):
        files = filedialog.askopenfilenames(title="追加する写真を選択", filetypes=[("画像", "*.jpg *.jpeg *.png")])
        if not files: return
        PHOTOS_DIR.mkdir(parents=True, exist_ok=True)
        for fp in files:
            fname = Path(fp).name
            target = PHOTOS_DIR / fname
            if target.exists() and not messagebox.askyesno("確認", f"{fname} は既に存在します。上書きしますか？"):
                continue
            shutil.copy2(fp, target)
            self.pm.add_photo_entry(fname)
        self.pm.save_json()
        self.refresh_tree()

    def on_save(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning("警告", "保存する写真が選択されていません")
            return
            
        values = self.tree.item(sel[0], "values")
        if not values:
            return
            
        try:
            pid = int(values[0])
        except ValueError:
            messagebox.showerror("エラー", "無効な写真IDです")
            return
            
        photo = next((p for p in self.pm.photos if int(p.get("id", 0)) == pid), None)
        if not photo:
            messagebox.showerror("エラー", "写真が見つかりません")
            return
            
        # ロールの変更を確認
        old_roll = photo.get("roll", "misc")
        new_roll = self.vars["roll"].get().strip()
        
        if new_roll and new_roll != old_roll:
            if messagebox.askyesno("ロール変更の確認", 
                                 f"ロールを '{old_roll}' から '{new_roll}' に変更しますか？\n"
                                 "これは今後のファイル名生成に影響する可能性があります。"):
                photo["roll"] = new_roll
        elif not new_roll:
            messagebox.showwarning("警告", "ロールを空にすることはできません。")
            return
            
        for k in self.vars:
            if k == "id":
                try:
                    photo[k] = int(self.vars[k].get())
                except ValueError:
                    photo[k] = pid
            elif k == "tags":
                tags_text = self.vars[k].get()
                photo[k] = [tag.strip() for tag in tags_text.split(",") if tag.strip()]
            elif k != "roll":  # roll は上で処理済み
                photo[k] = self.vars[k].get()
                
        desc_text = self.desc_text.get("1.0", tk.END).strip()
        photo["description"] = [p for p in desc_text.split("\n") if p.strip()]
        
        if self.pm.save_json():
            messagebox.showinfo("成功", "写真情報を更新しました")
            self.refresh_tree()

    def on_delete(self):
        sel = self.tree.selection()
        if not sel:
            messagebox.showwarning("警告", "削除する写真が選択されていません")
            return
            
        values = self.tree.item(sel[0], "values")
        if not values:
            return
            
        try:
            pid = int(values[0])
        except ValueError:
            messagebox.showerror("エラー", "無効な写真IDです")
            return
            
        if not messagebox.askyesno("確認", "この写真を削除しますか？\n(JSONデータのみ削除され、実際の画像ファイルは残ります)"):
            return
            
        self.pm.photos = [p for p in self.mp.photos if int(p.get("id", 0)) != pid]
        
        if self.pm.save_json():
            messagebox.showinfo("成功", "写真データを削除しました")
            self.refresh_tree()
            
        # フォームをクリア
        for var in self.vars.values():
            var.set("")
        self.desc_text.delete("1.0", tk.END)
        self.preview_img_label.configure(image="")

    def on_save_json(self):
        if self.pm.save_json():
            messagebox.showinfo("保存完了", "JSONファイルを保存しました")

    def on_generate(self):
        if not GENERATE_JS.exists():
            messagebox.showerror("エラー", "generatePhotoPages.js が見つかりません")
            return
        try:
            # まずJSONファイルを保存
            if not self.pm.save_json():
                return
                
            subprocess.run(["node", str(GENERATE_JS)], check=True, cwd=str(PROJECT_DIR))
            messagebox.showinfo("完了", "HTMLファイルを生成しました")
        except subprocess.CalledProcessError as e:
            messagebox.showerror("エラー", f"HTML生成中にエラーが発生しました: {e}")
        except FileNotFoundError:
            messagebox.showerror("エラー", "node コマンドが見つかりません。Node.jsがインストールされていることを確認してください。")

    def add_tag(self, tag):
        """タグを追加"""
        current_tags = self.vars["tags"].get()
        if current_tags:
            tags = [t.strip() for t in current_tags.split(",")]
            if tag not in tags:
                tags.append(tag)
                self.vars["tags"].set(", ".join(tags))
        else:
            self.vars["tags"].set(tag)

if __name__ == "__main__":
    root = tk.Tk()
    app = PhotoManagerGUI(root)
    root.mainloop()