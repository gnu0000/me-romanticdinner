
# tables for romandicDinner db: menu

create table item (
   id           int auto_increment primary key,
   kind         varchar(255),
   type         varchar(255)  default "entry",
   description  varchar(255) 
) engine=myisam default charset=latin1;

create table menu (
   id       int auto_increment primary key,
   created  timestamp default current_timestamp,
   archived tinyint(1)    default 0,
   label    varchar(255),
   data     mediumtext
) engine=myisam default charset=latin1;
