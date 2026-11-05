# Flow :: user upload file and read data from file

## System flow
1. User choose file from local computer or drag and drop file to dropzone
   * Only accept image file (png, jpg, jpeg) and max size 5MB
2. System preview image + name in web
3. Upload file to server
4. Server read data from file by use Anthropic API (https://platform.claude.com/docs/en/build-with-claude/working-with-messages)
    * use png base64 to send to API
    * response with JSON data (shop_name, and total amount/price)
    * Rate limit call to Anthropic API = 100 request per hour (memory-based)
5. Show data in web (shop_name, and total amount/price)