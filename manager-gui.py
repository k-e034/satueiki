# coding: utf-8
import os
import json
import tkinter as tk
from tkinter import ttk, filedialog, messagebox
from PIL import Image, ImageTk
from datetime import datetime
import re
import shutil
from pathlib import Path

class PhotoManagerApp:
    def __init__(self, root):
        self.root = root
        self.root.title("撮影記 - 写真管理ツール")
        self.root.geometry("1200x800")
        
        # プロジェクトディレクトリの設定
        self.project_dir = os.path.dirname(os.path.abspath(__file__))
        self.photos_dir = os.path.join(self.project_dir, "images", "photos")
        self.json_file = os.path.join(self.project_dir, "data", "photos.json")
        
        # 写真データを読み込む
        self.load_photos_data()
        
        # メインフレームの作成
        self.create_widgets()
        
        # 写真一覧の更新
        self.update_photo_list()

    def load_photos_data(self):
        """JSONファイルから写真データを読み込む"""
        try:
            # data/photos.jsonが存在しない場合は作成
            os.makedirs(os.path.dirname(self.json_file), exist_ok=True)
            
            if os.path.exists(self.json_file):
                with open(self.json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.photos = data.get("photos", [])
            else:
                self.photos = []
                self.save_photos_data()  # 空のJSONファイルを作成
        except Exception as e:
            messagebox.showerror("エラー", f"写真データの読み込み中にエラーが発生しました: {str(e)}")
            self.photos = []

    def save_photos_data(self):
        """写真データをJSONファイルに保存する"""
        try:
            # IDでソートして保存
            self.photos.sort(key=lambda x: x.get("id", 0))
            
            with open(self.json_file, 'w', encoding='utf-8') as f:
                json.dump({"photos": self.photos}, f, ensure_ascii=False, indent=2)
                
            messagebox.showinfo("成功", "写真データを保存しました。")
            return True
        except Exception as e:
            messagebox.showerror("エラー", f"写真データの保存中にエラーが発生しました: {str(e)}")
            return False

    def create_widgets(self):
        """UIウィジェットの作成"""
        # メインフレームを分割
        self.paned_window = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        self.paned_window.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        
        # 左側：写真リスト
        self.left_frame = ttk.Frame(self.paned_window, width=300)
        self.paned_window.add(self.left_frame, weight=1)
        
        # 右側：写真詳細
        self.right_frame = ttk.Frame(self.paned_window)
        self.paned_window.add(self.right_frame, weight=2)
        
        # 左側のコンテンツ
        self.create_left_frame()
        
        # 右側のコンテンツ
        self.create_right_frame()
        
        # 下部のボタンエリア
        self.create_button_area()

    def create_left_frame(self):
        """左側フレームのウィジェット作成"""
        # 写真の追加ボタン
        self.add_photo_btn = ttk.Button(self.left_frame, text="写真を追加", command=self.add_photos)
        self.add_photo_btn.pack(fill=tk.X, pady=(0, 5))
        
        # 写真リストのラベル
        list_label = ttk.Label(self.left_frame, text="写真一覧:")
        list_label.pack(anchor=tk.W)
        
        # 写真リスト（Treeview）
        self.photo_tree = ttk.Treeview(self.left_frame, columns=("id", "title"), show="headings")
        self.photo_tree.heading("id", text="ID")
        self.photo_tree.heading("title", text="タイトル")
        self.photo_tree.column("id", width=50)
        self.photo_tree.column("title", width=250)
        self.photo_tree.pack(fill=tk.BOTH, expand=True)
        
        # 選択イベントのバインド
        self.photo_tree.bind("<<TreeviewSelect>>", self.on_photo_select)
        
        # スクロールバー
        scrollbar = ttk.Scrollbar(self.left_frame, orient=tk.VERTICAL, command=self.photo_tree.yview)
        scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        self.photo_tree.configure(yscrollcommand=scrollbar.set)

    def create_right_frame(self):
        """右側フレームのウィジェット作成"""
        # 詳細情報フレーム
        self.detail_frame = ttk.Frame(self.right_frame)
        self.detail_frame.pack(fill=tk.BOTH, expand=True)
        
        # 写真プレビュー
        self.preview_label = ttk.Label(self.detail_frame, text="プレビュー")
        self.preview_label.pack(anchor=tk.W, pady=(0, 5))
        
        self.preview_frame = ttk.Frame(self.detail_frame, width=300, height=200, relief=tk.SUNKEN, borderwidth=1)
        self.preview_frame.pack(fill=tk.X, padx=5, pady=5)
        
        self.preview_image = ttk.Label(self.preview_frame)
        self.preview_image.pack(fill=tk.BOTH, expand=True)
        
        # スクロール可能なキャンバス
        self.canvas = tk.Canvas(self.detail_frame)
        self.scrollbar = ttk.Scrollbar(self.detail_frame, orient=tk.VERTICAL, command=self.canvas.yview)
        self.scrollable_frame = ttk.Frame(self.canvas)
        
        self.scrollable_frame.bind(
            "<Configure>",
            lambda e: self.canvas.configure(scrollregion=self.canvas.bbox("all"))
        )
        
        self.canvas.create_window((0, 0), window=self.scrollable_frame, anchor=tk.NW)
        self.canvas.configure(yscrollcommand=self.scrollbar.set)
        
        self.canvas.pack(side=tk.LEFT, fill=tk.BOTH, expand=True)
        self.scrollbar.pack(side=tk.RIGHT, fill=tk.Y)
        
        # 基本情報
        self.create_form_fields()

    def create_form_fields(self):
        """フォームフィールドの作成"""
        fields_frame = ttk.Frame(self.scrollable_frame)
        fields_frame.pack(fill=tk.X, expand=True, padx=10, pady=10)
        
        # 基本情報
        ttk.Label(fields_frame, text="基本情報", font=("", 12, "bold")).grid(row=0, column=0, sticky=tk.W, pady=(10, 5))
        
        # ID（読み取り専用）
        ttk.Label(fields_frame, text="ID:").grid(row=1, column=0, sticky=tk.W, pady=2)
        self.id_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.id_var, state="readonly", width=10).grid(row=1, column=1, sticky=tk.W, pady=2)
        
        # タイトル
        ttk.Label(fields_frame, text="タイトル:").grid(row=2, column=0, sticky=tk.W, pady=2)
        self.title_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.title_var, width=40).grid(row=2, column=1, sticky=tk.W, pady=2)
        
        # 画像ファイル
        ttk.Label(fields_frame, text="画像ファイル:").grid(row=3, column=0, sticky=tk.W, pady=2)
        self.image_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.image_var, width=40, state="readonly").grid(row=3, column=1, sticky=tk.W, pady=2)
        
        # ページ
        ttk.Label(fields_frame, text="ページ:").grid(row=4, column=0, sticky=tk.W, pady=2)
        self.page_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.page_var, width=40).grid(row=4, column=1, sticky=tk.W, pady=2)
        
        # 日付
        ttk.Label(fields_frame, text="日付 (YYYY-MM-DD):").grid(row=5, column=0, sticky=tk.W, pady=2)
        self.date_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.date_var, width=40).grid(row=5, column=1, sticky=tk.W, pady=2)
        
        # 表示用日付
        ttk.Label(fields_frame, text="表示用日付:").grid(row=6, column=0, sticky=tk.W, pady=2)
        self.date_display_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.date_display_var, width=40).grid(row=6, column=1, sticky=tk.W, pady=2)
        
        # 撮影場所
        ttk.Label(fields_frame, text="撮影場所:").grid(row=7, column=0, sticky=tk.W, pady=2)
        self.location_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.location_var, width=40).grid(row=7, column=1, sticky=tk.W, pady=2)
        
        # カメラ
        ttk.Label(fields_frame, text="カメラ:").grid(row=8, column=0, sticky=tk.W, pady=2)
        self.camera_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.camera_var, width=40).grid(row=8, column=1, sticky=tk.W, pady=2)
        
        # レンズ
        ttk.Label(fields_frame, text="レンズ:").grid(row=9, column=0, sticky=tk.W, pady=2)
        self.lens_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.lens_var, width=40).grid(row=9, column=1, sticky=tk.W, pady=2)
        
        # フィルム
        ttk.Label(fields_frame, text="フィルム:").grid(row=10, column=0, sticky=tk.W, pady=2)
        self.film_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.film_var, width=40).grid(row=10, column=1, sticky=tk.W, pady=2)
        
        # 説明
        ttk.Label(fields_frame, text="説明 (段落ごとに改行):").grid(row=11, column=0, sticky=tk.W, pady=2)
        self.description_text = tk.Text(fields_frame, height=5, width=40)
        self.description_text.grid(row=11, column=1, sticky=tk.W, pady=2)
        
        # タグ
        ttk.Label(fields_frame, text="タグ (カンマ区切り):").grid(row=12, column=0, sticky=tk.W, pady=2)
        self.tags_var = tk.StringVar()
        ttk.Entry(fields_frame, textvariable=self.tags_var, width=40).grid(row=12, column=1, sticky=tk.W, pady=2)
        
        # タグ補助ボタン
        tags_btn_frame = ttk.Frame(fields_frame)
        tags_btn_frame.grid(row=13, column=1, sticky=tk.W, pady=2)
        
        # よく使うタグのボタン
        common_tags = [
            ("2025-03", "2025年3月"), ("tokyo", "東京都"), ("mono", "モノクロ"),
            ("nikon-f70d", "Nikon F70D"), ("snap", "スナップ")
        ]
        
        for i, (tag, label) in enumerate(common_tags):
            btn = ttk.Button(tags_btn_frame, text=label, 
                           command=lambda t=tag: self.add_tag(t))
            btn.grid(row=0, column=i, padx=2)

    def create_button_area(self):
        """ボタンエリアの作成"""
        button_frame = ttk.Frame(self.root)
        button_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # 保存ボタン
        self.save_btn = ttk.Button(button_frame, text="変更を保存", command=self.save_current_photo)
        self.save_btn.pack(side=tk.LEFT, padx=5)
        
        # 削除ボタン
        self.delete_btn = ttk.Button(button_frame, text="写真を削除", command=self.delete_photo)
        self.delete_btn.pack(side=tk.LEFT, padx=5)
        
        # JSON保存ボタン
        self.save_json_btn = ttk.Button(button_frame, text="JSONファイルを保存", command=self.save_photos_data)
        self.save_json_btn.pack(side=tk.RIGHT, padx=5)
        
        # ページ生成ボタン
        self.generate_btn = ttk.Button(button_frame, text="HTMLページを生成", command=self.generate_pages)
        self.generate_btn.pack(side=tk.RIGHT, padx=5)

    def update_photo_list(self):
        """写真リストを更新"""
        # Treeviewをクリア
        for item in self.photo_tree.get_children():
            self.photo_tree.delete(item)
        
        # 写真をリストに追加
        for photo in self.photos:
            self.photo_tree.insert("", "end", values=(photo.get("id", ""), photo.get("title", "")))

    def on_photo_select(self, event):
        """写真が選択されたときの処理"""
        selected_items = self.photo_tree.selection()
        if not selected_items:
            return
        
        # 選択された行のデータを取得
        item = selected_items[0]
        photo_id = self.photo_tree.item(item, "values")[0]
        
        # IDからphotoデータを検索
        photo = next((p for p in self.photos if str(p.get("id", "")) == str(photo_id)), None)
        if photo:
            self.display_photo_details(photo)

    def display_photo_details(self, photo):
        """写真の詳細情報を表示"""
        # フォームにデータを設定
        self.id_var.set(photo.get("id", ""))
        self.title_var.set(photo.get("title", ""))
        self.image_var.set(photo.get("image", ""))
        self.page_var.set(photo.get("page", ""))
        self.date_var.set(photo.get("date", ""))
        self.date_display_var.set(photo.get("dateDisplay", ""))
        self.location_var.set(photo.get("location", ""))
        self.camera_var.set(photo.get("camera", ""))
        self.lens_var.set(photo.get("lens", ""))
        self.film_var.set(photo.get("film", ""))
        
        # テキストエリアをクリアして説明文を設定
        self.description_text.delete(1.0, tk.END)
        description = photo.get("description", "")
        if isinstance(description, list):
            self.description_text.insert(tk.END, "\n".join(description))
        else:
            self.description_text.insert(tk.END, description)
        
        # タグを設定
        self.tags_var.set(", ".join(photo.get("tags", [])))
        
        # プレビュー画像を表示
        self.display_preview(photo.get("image", ""))

    def display_preview(self, image_path):
        """プレビュー画像を表示"""
        try:
            full_path = os.path.join(self.project_dir, image_path)
            if os.path.exists(full_path):
                # PILで画像を開く
                img = Image.open(full_path)
                
                # プレビューサイズに合わせてリサイズ
                width = 300
                ratio = width / img.width
                height = int(img.height * ratio)
                
                img = img.resize((width, height), Image.LANCZOS)
                
                # Tkinter用の画像に変換
                self.tk_img = ImageTk.PhotoImage(img)
                
                # ラベルに表示
                self.preview_image.configure(image=self.tk_img)
            else:
                self.preview_image.configure(image="")
                messagebox.showwarning("警告", "画像ファイルが見つかりません: " + image_path)
        except Exception as e:
            self.preview_image.configure(image="")
            messagebox.showwarning("エラー", f"画像のプレビュー表示中にエラーが発生しました: {str(e)}")

    def add_photos(self):
        """写真を追加"""
        # ファイル選択ダイアログを表示
        filepaths = filedialog.askopenfilenames(
            title="追加する写真を選択",
            filetypes=[("画像ファイル", "*.jpg *.jpeg *.png *.JPG *.JPEG *.PNG")]
        )
        
        if not filepaths:
            return
            
        # 写真の追加処理
        for filepath in filepaths:
            self.add_single_photo(filepath)
            
        # リストを更新
        self.update_photo_list()

    def add_single_photo(self, filepath):
        """単一の写真を追加"""
        try:
            # ファイル名を取得
            filename = os.path.basename(filepath)
            
            # ファイルが既に存在する場合はスキップ
            target_path = os.path.join(self.photos_dir, filename)
            if os.path.exists(target_path):
                if not messagebox.askyesno("確認", f"ファイル {filename} は既に存在します。上書きしますか？"):
                    return None
            
            # photos ディレクトリが存在しない場合は作成
            os.makedirs(self.photos_dir, exist_ok=True)
            
            # 写真ファイルをコピー
            shutil.copy2(filepath, target_path)
            
            # 次のIDを決定
            next_id = 1
            if self.photos:
                next_id = max(photo.get("id", 0) for photo in self.photos) + 1
                
            # 写真の情報を取得
            img = Image.open(target_path)
            img_date = datetime.now()  # 現在日時をデフォルトに
            
            # 日付のフォーマット
            date_str = img_date.strftime("%Y-%m-%d")
            date_display = img_date.strftime("%Y年%m月%d日")
            
            # 写真エントリを作成
            new_photo = {
                "id": next_id,
                "title": os.path.splitext(filename)[0],
                "description": ["写真の説明を入力してください"],
                "image": f"images/photos/{filename}",
                "page": f"photo{next_id}.html",
                "date": date_str,
                "dateDisplay": date_display,
                "location": "",
                "camera": "",
                "lens": "",
                "film": "",
                "tags": []
            }
            
            # 写真リストに追加
            self.photos.append(new_photo)
            
            return new_photo
        except Exception as e:
            messagebox.showerror("エラー", f"写真の追加中にエラーが発生しました: {str(e)}")
            return None

    def save_current_photo(self):
        """現在選択されている写真の情報を保存"""
        selected_items = self.photo_tree.selection()
        if not selected_items:
            messagebox.showwarning("警告", "保存する写真が選択されていません")
            return
            
        item = selected_items[0]
        photo_id = self.photo_tree.item(item, "values")[0]
        
        # IDからphotoデータを検索
        photo_index = None
        for i, photo in enumerate(self.photos):
            if str(photo.get("id", "")) == str(photo_id):
                photo_index = i
                break
                
        if photo_index is None:
            messagebox.showerror("エラー", "写真データが見つかりません")
            return
            
        # フォームからデータを取得
        title = self.title_var.get()
        page = self.page_var.get()
        date = self.date_var.get()
        date_display = self.date_display_var.get()
        location = self.location_var.get()
        camera = self.camera_var.get()
        lens = self.lens_var.get()
        film = self.film_var.get()
        
        # 説明を取得（改行で分割してリスト化）
        description_text = self.description_text.get(1.0, tk.END).strip()
        description = [p for p in description_text.split("\n") if p.strip()]
        
        # タグを取得（カンマで分割してリスト化）
        tags_text = self.tags_var.get()
        tags = [tag.strip() for tag in tags_text.split(",") if tag.strip()]
        
        # 写真データを更新
        self.photos[photo_index].update({
            "title": title,
            "page": page,
            "date": date,
            "dateDisplay": date_display,
            "location": location,
            "camera": camera,
            "lens": lens,
            "film": film,
            "description": description,
            "tags": tags
        })
        
        # Treeviewを更新
        self.photo_tree.item(item, values=(photo_id, title))
        
        messagebox.showinfo("成功", "写真情報を更新しました")

    def delete_photo(self):
        """選択された写真を削除"""
        selected_items = self.photo_tree.selection()
        if not selected_items:
            messagebox.showwarning("警告", "削除する写真が選択されていません")
            return
            
        if not messagebox.askyesno("確認", "選択した写真を削除しますか？\n(JSONデータのみ削除され、実際の画像ファイルは残ります)"):
            return
            
        item = selected_items[0]
        photo_id = self.photo_tree.item(item, "values")[0]
        
        # IDからphotoデータを検索して削除
        self.photos = [p for p in self.photos if str(p.get("id", "")) != str(photo_id)]
        
        # Treeviewから削除
        self.photo_tree.delete(item)
        
        # フォームをクリア
        self.clear_form()
        
        messagebox.showinfo("成功", "写真データを削除しました")

    def clear_form(self):
        """フォームをクリア"""
        self.id_var.set("")
        self.title_var.set("")
        self.image_var.set("")
        self.page_var.set("")
        self.date_var.set("")
        self.date_display_var.set("")
        self.location_var.set("")
        self.camera_var.set("")
        self.lens_var.set("")
        self.film_var.set("")
        self.description_text.delete(1.0, tk.END)
        self.tags_var.set("")
        self.preview_image.configure(image="")

    def add_tag(self, tag):
        """タグを追加"""
        current_tags = self.tags_var.get()
        if current_tags:
            tags = [t.strip() for t in current_tags.split(",")]
            if tag not in tags:
                tags.append(tag)
                self.tags_var.set(", ".join(tags))
        else:
            self.tags_var.set(tag)

    def generate_pages(self):
        """HTMLページを生成"""
        # まず写真データを保存
        if not self.save_photos_data():
            return
            
        # Node.jsを使ってページを生成
        try:
            script_path = os.path.join(self.project_dir, "generatePhotoPages.js")
            if not os.path.exists(script_path):
                messagebox.showerror("エラー", "generatePhotoPages.jsが見つかりません")
                return
                
            # コマンドを実行
            import subprocess
            result = subprocess.run(["node", script_path], 
                                   cwd=self.project_dir,
                                   capture_output=True, 
                                   text=True)
                                   
            if result.returncode == 0:
                # stdoutがNoneの場合の対応
                output_message = result.stdout if result.stdout else ""
                messagebox.showinfo("成功", f"HTMLページの生成が完了しました\n{output_message}")
            else:
                # stderrがNoneの場合の対応
                error_message = result.stderr if result.stderr else ""
                messagebox.showerror("エラー", f"HTMLページの生成中にエラーが発生しました\n{error_message}")
        except Exception as e:
            messagebox.showerror("エラー", f"HTMLページの生成中にエラーが発生しました: {str(e)}")


if __name__ == "__main__":
    root = tk.Tk()
    app = PhotoManagerApp(root)
    root.mainloop()