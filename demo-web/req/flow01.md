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

## UI Elements in table format
| Element | Description | Data test id |
| --- | --- | --- |
| Dropzone | Area for user to drag and drop file or click to choose file | test_id_dropzone |
| File preview | Show image preview and file name | test_id_filePreview |
| Remove file button | Button to remove file from dropzone | test_id_removeFileButton |
| Upload button | Button to upload file to server | test_id_uploadButton |
| shop_name | Show shop name extracted from file | test_id_extractedShopName |
| total amount/price | Show total amount/price extracted from file | test_id_extractedTotalAmount |

## UI test cases

### TC001 :: Successfully upload file and read data from file
1. User choose file from local computer or drag and drop file to dropzone
2. System preview image + name in web
3. Upload file to server
4. Display data on web (shop_name, and total amount/price)  

Inputs in table format:
| Input | Value |
| --- | --- |
| File | test-data/receipt-1.png |


Expected Outputs
| Output | Value |
| --- | --- |
| Shop Name | Test Shop |
| Total Amount | $100.00 |