# Strava Kudo All

Chrome extension để tự động kudo tất cả các hoạt động trên Strava dashboard.

## Tính năng

- ✅ Thêm nút "Kudo All" vào header của Strava
- ✅ Tự động kudo tất cả activities hiển thị trên trang hiện tại
- ✅ Chỉ kudo những activity chưa được kudo (bỏ qua những activity đã kudo)
- ✅ Hiển thị thông báo số lượng activity đã kudo
- ✅ Không cần scroll hoặc load thêm - chỉ kudo những gì đang hiển thị

## Cài đặt

1. Tải hoặc clone repository này
2. Mở Chrome và truy cập `chrome://extensions/`
3. Bật "Developer mode" (góc trên bên phải)
4. Click "Load unpacked"
5. Chọn thư mục `strava_kudo`

## Sử dụng

1. Truy cập https://www.strava.com/dashboard
2. Nhấn vào nút "Kudo All" trên header
3. Extension sẽ tự động kudo tất cả activities chưa được kudo
4. Thông báo sẽ hiển thị số lượng activity đã kudo

## Cấu trúc

```
strava_kudo/
├── manifest.json       # Cấu hình extension
├── content.js          # Logic chính
├── styles.css          # Giao diện
├── icon16.png          # Icon 16x16
├── icon48.png          # Icon 48x48
└── icon128.png         # Icon 128x128
```

## Lưu ý

- Extension chỉ hoạt động trên trang dashboard của Strava
- Chỉ kudo những activity hiển thị trên trang hiện tại (không tự động scroll)
- Có delay nhỏ giữa các lần kudo để tránh rate limiting
