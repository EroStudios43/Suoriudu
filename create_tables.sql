-- Create the tables for the Kokelas-application

-- Create users-table
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  iduser int PRIMARY KEY AUTO_INCREMENT UNIQUE NOT NULL,
  firstname varchar(45) NOT NULL,
  lastname varchar(45) NOT NULL,
  email varchar(60) NOT NULL,
  phone varchar(45),
  role varchar(45) NOT NULL,
  password varchar(255) NOT NULL,
  avatar_seed varchar(255)
);

-- Create courses-table
DROP TABLE IF EXISTS courses;
CREATE TABLE courses (
  idcourse int PRIMARY KEY AUTO_INCREMENT UNIQUE NOT NULL,
  coursename varchar(45) NOT NULL,
  course_description varchar(255),
  course_start_time datetime,
  course_end_time datetime

);

-- Create coursemembers-table
DROP TABLE IF EXISTS coursemembers;
CREATE TABLE coursemembers (
  iduser int NOT NULL,
  idcourse int NOT NULL,
  userrole varchar(45) NOT NULL,
  FOREIGN KEY (iduser) REFERENCES users(iduser) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idcourse) REFERENCES courses(idcourse) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create materials-table
DROP TABLE IF EXISTS materials;
CREATE TABLE materials (
  idmaterials int PRIMARY KEY AUTO_INCREMENT UNIQUE NOT NULL,
  idcourse int NOT NULL,
  material_name varchar(50) NOT NULL,
  material_description varchar(500),
  material TEXT,
  FOREIGN KEY (idcourse) REFERENCES courses(idcourse) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create exercise-table
DROP TABLE IF EXISTS exercises;
CREATE TABLE exercises (
  idexercise int PRIMARY KEY AUTO_INCREMENT UNIQUE NOT NULL,
  idweek int NOT NULL,
  exercise_name varchar(45) NOT NULL,
  exercise_description varchar(500),
  exercise_type varchar(45) NOT NULL,
  start_time datetime NOT NULL,
  end_time datetime NOT NULL,
  allow_late_submissions tinyint NOT NULL,
  max_time varchar(50),
  active_monitors varchar(255),
  exam_password_student varchar(45),
  FOREIGN KEY (idweek) REFERENCES weeks(idweek) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create exerciseresult-table
DROP TABLE IF EXISTS exerciseresults;
CREATE TABLE exerciseresults (
  idexerciseresult int PRIMARY KEY AUTO_INCREMENT UNIQUE NOT NULL,
  iduser int NOT NULL,
  idexercise int NOT NULL,
  starting_time datetime,
  complete_time datetime,
  ai_notes TEXT,
  FOREIGN KEY (iduser) REFERENCES users(iduser),
  FOREIGN KEY (idexercise) REFERENCES exercises(idexercise) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create task-table
DROP TABLE IF EXISTS task;
CREATE TABLE task (
  idtask int PRIMARY KEY AUTO_INCREMENT UNIQUE NOT NULL,
  idexercise int NOT NULL,
  tasktype varchar(45) NOT NULL,
  question varchar(1000) NOT NULL,
  answer MEDIUMTEXT,
  points varchar(45),
  FOREIGN KEY (idexercise) REFERENCES exercises(idexercise) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create taskresult-table
DROP TABLE IF EXISTS taskresults;
CREATE TABLE taskresults (
  idtaskresult int PRIMARY KEY AUTO_INCREMENT UNIQUE NOT NULL,
  idtask int NOT NULL,
  iduser int NOT NULL,
  idexerciseresult int NOT NULL,
  answer MEDIUMTEXT,
  points varchar(45),
  teacher_comment TEXT,
  FOREIGN KEY (idtask) REFERENCES task(idtask) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (iduser) REFERENCES users(iduser),
  FOREIGN KEY (idexerciseresult) REFERENCES exerciseresults(idexerciseresult) ON DELETE CASCADE ON UPDATE CASCADE
);

-- Create taskcomments-table
DROP TABLE IF EXISTS taskcomments;
CREATE TABLE taskcomments (
  idtaskcomments int PRIMARY KEY AUTO_INCREMENT UNIQUE NOT NULL,
  idtaskresult int NOT NULL,
  idcommentor int NOT NULL,
  public tinyint NOT NULL,
  anonymous tinyint NOT NULL,
  comment TEXT NOT NULL,
  timestamp_of_message datetime NOT NULL,
  comment_read tinyint NOT NULL DEFAULT 0,
  FOREIGN KEY (idtaskresult) REFERENCES taskresults(idtaskresult) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (idcommentor) REFERENCES users(iduser)
);

-- Create weeks-table
DROP TABLE IF EXISTS weeks;
CREATE TABLE weeks (
  idweek INT PRIMARY KEY AUTO_INCREMENT,
  idcourse INT,
  week_name VARCHAR(255),
  week_description TEXT,
  FOREIGN KEY (idcourse) REFERENCES courses(idcourse) ON DELETE CASCADE ON UPDATE CASCADE
);