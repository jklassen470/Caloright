DROP DATABASE IF EXISTS caloDB;
CREATE DATABASE caloDB;
USE caloDB;

-- users: stores the user's account information such as passwords, emails, activity status, created/updated times, and avatar stuff
CREATE TABLE users (
    user_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name     VARCHAR(100)        NOT NULL,
    email         VARCHAR(255)        NOT NULL UNIQUE,
    password_hash VARCHAR(255)        NOT NULL,
    avatar_type   ENUM('upload','default') NOT NULL DEFAULT 'default',
    avatar_url    VARCHAR(500)        NULL,
    is_active     BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- twofact: shares the auth code between the app and google authenticator, and tracks whether the user has finished setting it up. there is exactly 1 row per user
CREATE TABLE twofact (
    tfa_id        INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED        NOT NULL UNIQUE,
    secret        VARCHAR(64)         NOT NULL,
    is_enabled    BOOLEAN             NOT NULL DEFAULT FALSE,
    verified_at   DATETIME            NULL,
    created_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- twofactbackup: backup codes for when a user loses access to their phone. codes can only be used once and record a timestamp when used
CREATE TABLE twofactbackup (
    code_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id       INT UNSIGNED        NOT NULL,
    code_hash     VARCHAR(255)        NOT NULL,
    used_at       DATETIME            NULL,
    created_at    DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- user_goals: a row is added when a user sets a calorie goal with optional macro targets. old goals are kept and not overwritten, only one is active at a time
CREATE TABLE user_goals (
    goal_id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id              INT UNSIGNED        NOT NULL,
    daily_calorie_target INT UNSIGNED        NOT NULL,
    protein_target_g     DECIMAL(6,2)        NULL,
    carbs_target_g       DECIMAL(6,2)        NULL,
    fat_target_g         DECIMAL(6,2)        NULL,
    period_start         DATE                NOT NULL,
    period_end           DATE                NOT NULL,
    is_active            BOOLEAN             NOT NULL DEFAULT TRUE,
    created_at           DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    CHECK (period_end >= period_start)
);

-- foods: the library of every food in the system. has 2 types of entries: foods pulled from the api and foods created by the user
CREATE TABLE foods (
    food_id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    usda_food_id        BIGINT UNSIGNED     NULL UNIQUE,
    food_name           VARCHAR(255)        NOT NULL,
    brand_name          VARCHAR(255)        NULL,
    serving_description VARCHAR(100)        NULL,
    serving_size_g      DECIMAL(8,2)        NULL,
    calories_per_serving DECIMAL(8,2)       NOT NULL,
    protein_g           DECIMAL(6,2)        NOT NULL DEFAULT 0,
    carbs_g             DECIMAL(6,2)        NOT NULL DEFAULT 0,
    fat_g               DECIMAL(6,2)        NOT NULL DEFAULT 0,
    fiber_g             DECIMAL(6,2)        NULL,
    sugar_g             DECIMAL(6,2)        NULL,
    sodium_mg           DECIMAL(8,2)        NULL,
    source              ENUM('usda','manual','quick','label_scan') NOT NULL DEFAULT 'manual',
    created_by_user_id  INT UNSIGNED        NULL,
    created_at          DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_user_id) REFERENCES users(user_id) ON DELETE SET NULL
);

-- meals: a container for a single meal. does not contain the actual food items, just meal type, notes, time and date logged
CREATE TABLE meals (
    log_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id     INT UNSIGNED        NOT NULL,
    log_date    DATE                NOT NULL,
    meal_type   ENUM('breakfast','lunch','dinner','snack','other') NOT NULL DEFAULT 'other',
    notes       VARCHAR(500)        NULL,
    logged_at   DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    INDEX idx_meals_user_date (user_id, log_date)
);

-- m_Items: where the actual meal foods are stored. each row is one food added to one meal, all pointing back to a row in meals. records servings eaten and takes a snapshot of nutrition info at the moment
CREATE TABLE m_Items (
    item_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    log_id          INT UNSIGNED        NOT NULL,
    food_id         INT UNSIGNED        NOT NULL,
    servings        DECIMAL(5,2)        NOT NULL DEFAULT 1.00,
    calories        DECIMAL(8,2)        NOT NULL,
    protein_g       DECIMAL(6,2)        NOT NULL DEFAULT 0,
    carbs_g         DECIMAL(6,2)        NOT NULL DEFAULT 0,
    fat_g           DECIMAL(6,2)        NOT NULL DEFAULT 0,
    add_method      ENUM('quick','manual','usda','label_scan') NOT NULL DEFAULT 'manual',
    FOREIGN KEY (log_id)   REFERENCES meals(log_id)   ON DELETE CASCADE,
    FOREIGN KEY (food_id)  REFERENCES foods(food_id)  ON DELETE RESTRICT
);

-- scans: tracks a nutrition label photo upload. sits in pending while the user reviews the parsed data, then gets marked confirmed once a food entry is created in foods
CREATE TABLE scans (
    scan_id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED        NOT NULL,
    image_url       VARCHAR(500)        NOT NULL,
    raw_ocr_result  JSON                NULL,
    parsed_food_id  INT UNSIGNED        NULL,
    status          ENUM('pending','confirmed','discarded') NOT NULL DEFAULT 'pending',
    scanned_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id)        REFERENCES users(user_id)  ON DELETE CASCADE,
    FOREIGN KEY (parsed_food_id) REFERENCES foods(food_id)  ON DELETE SET NULL
);

-- daily: pre-calculated totals per user per day so the dashboard doesn't recalculate from scratch every load. updated whenever a food is logged or deleted. also what the weekly bar chart reads from. exactly one row per user per day
CREATE TABLE daily (
    summary_id      INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED        NOT NULL,
    summary_date    DATE                NOT NULL,
    total_calories  DECIMAL(8,2)        NOT NULL DEFAULT 0,
    total_protein_g DECIMAL(8,2)        NOT NULL DEFAULT 0,
    total_carbs_g   DECIMAL(8,2)        NOT NULL DEFAULT 0,
    total_fat_g     DECIMAL(8,2)        NOT NULL DEFAULT 0,
    foods_logged    INT UNSIGNED        NOT NULL DEFAULT 0,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_date (user_id, summary_date),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- streaks: one row per user. tracks logging streak, going up by 1 if they logged yesterday, resetting to 0 if they missed a day. longest streak never goes down
CREATE TABLE streaks (
    streak_id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id         INT UNSIGNED        NOT NULL UNIQUE,
    current_streak  INT UNSIGNED        NOT NULL DEFAULT 0,
    longest_streak  INT UNSIGNED        NOT NULL DEFAULT 0,
    last_log_date   DATE                NULL,
    updated_at      DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- avatar: list of built-in avatars users can choose from if they don't upload their own
CREATE TABLE avatar (
    avatar_id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    label       VARCHAR(50)  NOT NULL,
    image_url   VARCHAR(500) NOT NULL
);

INSERT INTO avatar (label, image_url) VALUES
    ('Blue Circle',   '/avatars/default_blue.png'),
    ('Green Circle',  '/avatars/default_green.png'),
    ('Red Circle',    '/avatars/default_red.png'),
    ('Purple Circle', '/avatars/default_purple.png'),
    ('Orange Circle', '/avatars/default_orange.png');
