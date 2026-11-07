# M3E Notes — Sổ tay & Quản lý công việc (Material 3 Expressive)

Ứng dụng ghi chú, bảng thẻ (Cards Board) và danh sách việc cần làm theo ngôn ngữ thiết kế **Material 3 Expressive** (bảng màu Amber ấm, hỗ trợ cả giao diện Máy tính 1280dp và Điện thoại 412dp, lưu trữ cục bộ an toàn trên trình duyệt).

## Tính năng chính
- **Ghi chú đa nền tảng:** Chuyển đổi tức thì giữa bố cục **Máy tính (Master–Detail & Bảng thẻ Grid 3 cột)** và **Điện thoại (Danh sách → Chi tiết → Soạn thảo + Navigation Drawer)**.
- **Quản lý thời gian & hạn chót:** Gắn ngày/giờ hạn chót, lọc nhanh *Quá hạn / Hôm nay / 7 ngày tới*, gắn thẻ `#Tags` và ghim lên đầu.
- **Soạn thảo Markdown & Sao lưu:** Thanh công cụ định dạng nhanh, xuất từng ghi chú ra file `.md` hoặc sao lưu toàn bộ dữ liệu ra `.json`.
- **Việc cần làm (Checklist):** Thanh tiến độ hoàn thành trong ngày, lọc theo *Hôm nay* và *Ưu tiên cao ⭐*.
- **Cá nhân hóa:** Giao diện Sáng / Tối (Dark Mode), đổi phông chữ và phóng to/thu nhỏ cỡ chữ (85%–120%).

## Chạy trên máy (Local)

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000) trên trình duyệt.

## Xuất bản tĩnh (GitHub Pages / Vercel / Netlify)

```bash
npm run build
```

Thư mục `out/` chứa toàn bộ bản build tĩnh sẵn sàng triển khai lên bất kỳ dịch vụ hosting nào.
