-- Create sharing table
CREATE TABLE IF NOT EXISTS shares (
  id INT AUTO_INCREMENT PRIMARY KEY,
  item_type ENUM('file', 'document') NOT NULL,
  item_id INT NOT NULL,
  shared_by INT NOT NULL,
  shared_with VARCHAR(255) NOT NULL, -- email or user_id
  shared_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_item (item_type, item_id),
  INDEX idx_shared_with (shared_with)
); 