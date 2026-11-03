# AI Usage Guardian

Prototype cho đề tài Eureka 2026 **"The Formation of AI Trust in Human-in-the-Loop Systems"**: một công cụ giúp sinh viên giữ vai trò chủ động khi dùng AI, đặt "chân phanh" vào đúng lúc sử dụng.

Bản web được chuyển từ app Tkinter `main_AI.py`, giữ nguyên bố cục và logic:

| Tính năng | Mô tả |
|---|---|
| Phân tích Task | Xếp từng task nhỏ vào mức Cao / Trung bình / Thấp theo 60 nhóm quy tắc, luôn kèm lý do và lời nhắc Human-in-the-Loop |
| Gợi ý công cụ AI | Chọn công cụ phù hợp trong 284 công cụ thuộc 19 nhóm (chatbot, viết, hình ảnh, video, giọng nói, nhạc, lập trình, nghiên cứu, thiết kế, thuyết trình, marketing, tự động hoá, năng suất, dữ liệu, CSKH, học tập, 3D, tài chính–pháp lý–nhân sự, nền tảng AI), kèm lý do; người dùng phản hồi Có / Tôi sẽ thử / Không |
| Theo dõi phiên | Một phiên dùng được nhiều công cụ: chuyển công cụ bằng một chạm, thời gian tự chia cho từng công cụ; quy trình nhanh lưu sẵn tổ hợp hay dùng; cuối phiên chấm mức tin 1–5 (chung hoặc riêng từng công cụ) và trả lời có kiểm tra lại bằng công cụ/nguồn khác hay không |
| Kiểm chứng | Thống kê tỷ lệ phiên có kiểm chứng, so sánh mức tin khi có và không kiểm chứng, tỷ lệ phiên dùng nhiều công cụ |
| Thống kê đối chiếu | Đặt gợi ý của hệ thống cạnh điều người dùng thực sự làm; đánh dấu task mức Thấp vẫn giao cho AI (over-reliance) |
| Báo cáo tuần | Công cụ dùng nhiều / ít / được tin nhất, cảnh báo khi công cụ dùng nhiều nhất có mức tin thấp |

Dùng thử nhanh: ở màn hình đăng nhập, bấm **"Dùng thử nhanh với tài khoản demo"**.

## Cấu trúc

```
ai-usage-guardian/
├── index.html
├── run.py               chạy thử trên máy (PyCharm: Run)
├── assets/
│   ├── css/styles.css      giao diện + chuyển động
│   ├── js/i18n.js          chuỗi song ngữ VI / EN
│   ├── js/tools.js         danh mục 284 công cụ AI theo 19 nhóm
│   ├── js/rules.js         60 nhóm quy tắc phân loại task + bộ gợi ý công cụ
│   ├── js/app.js           giao diện, lưu trữ cục bộ, dữ liệu mẫu
│   └── fonts/              Samsung Sharp Sans (woff2)
└── .nojekyll
```

Không cần cài đặt, không có máy chủ. Dữ liệu lưu trong trình duyệt của từng người dùng (localStorage); mật khẩu được băm SHA-256.

## Chạy thử trên máy (PyCharm)

1. PyCharm → **File → Open…** → chọn folder `AI-Usage-Guardian` trên Desktop.
2. Mở `run.py` → chuột phải → **Run 'run'**. Trình duyệt tự mở `http://localhost:8000`.
3. Sửa code xong chỉ cần tải lại trang (Cmd+R). Dừng bằng nút **Stop**.

Không cần cài thư viện nào; `run.py` chỉ dùng thư viện chuẩn của Python.

## Đưa lên GitHub Pages

**Cách 1 — ngay trong PyCharm**
1. **VCS → Enable Version Control Integration…** → chọn **Git** (nếu PyCharm hỏi).
2. **Git → GitHub → Share Project on GitHub** → đặt tên repo `ai-usage-guardian`, bỏ chọn *Private* → **Share**. Đăng nhập GitHub nếu được hỏi, rồi **Add** toàn bộ file.

**Cách 2 — dùng Terminal (trong PyCharm: View → Tool Windows → Terminal)**
```bash
git init
git add .
git commit -m "AI Usage Guardian web"
git branch -M main
git remote add origin https://github.com/<tài-khoản>/ai-usage-guardian.git
git push -u origin main
```
(Tạo repo trống tên `ai-usage-guardian` trên github.com trước, không tick README.)

**Bật GitHub Pages:** repo → **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → **Save**. Sau 1–2 phút trang chạy tại `https://<tài-khoản>.github.io/ai-usage-guardian/`.

## Font

Giao diện dùng **Samsung Sharp Sans** (bản VL hỗ trợ tiếng Việt). Đây là font độc quyền ("All rights reserved", bản quyền thuộc Lucas Sharp / Samsung), không thuộc giấy phép của mã nguồn. Nếu cần tránh phát hành lại font trong repo công khai, xoá thư mục `assets/fonts/`: trang sẽ tự dùng font hệ thống thay thế.
