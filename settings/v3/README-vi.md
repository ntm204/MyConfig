# Hướng dẫn sử dụng cấu hình v3 cho VSCode

**Lưu ý:** Hãy đọc kỹ hướng dẫn của extension **"Custom CSS and JS Loader"** để tránh lỗi khi tuỳ biến giao diện.

### Các bước thực hiện:

1. Cài đặt extension "Custom CSS and JS Loader" cho VSCode.
2. Sao chép nội dung `settings.json` trong thư mục này vào file settings.json của bạn (lưu ý: thao tác này sẽ ghi đè cấu hình cũ).
3. Thêm đoạn sau vào settings.json:

```json
"vscode_custom_css.imports": [
    // Đường dẫn tuyệt đối tới file css/js tuỳ chỉnh
    // Ví dụ trên Mac hoặc Linux:
    // "file:///Users/ten-cua-ban/custom-vscode.css",
    // "file:///Users/ten-cua-ban/custom-vscode-script.js"
    // Trên Windows:
    // "file:///C:/duong-dan/custom-vscode.css",
    // "file:///C:/duong-dan/custom-vscode-script.js"
],
```

4. Nếu dùng Mac/Linux, có thể cần cấp quyền cho thư mục cài đặt VSCode:

```sh
sudo chown -R ten-cua-ban /usr/share/code
```

5. Kích hoạt extension "Custom CSS and JS Loader" từ Command Palette của VSCode.
6. Tuỳ biến file CSS/JS theo ý thích (có thể dùng file mẫu trong repo này).
7. Sau khi chỉnh sửa, reload lại extension (Reload Custom CSS and JS) từ Command Palette.

> **Tip:** Nếu thay đổi không có hiệu lực, hãy kiểm tra lại quyền truy cập file và đường dẫn tuyệt đối.
