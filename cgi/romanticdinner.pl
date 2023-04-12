#!perl
#
# This is the (lazy) REST backend for the RomanticDinner pages.
#
# todo
#   I should make this proper REST:
#     post requests should return Location header and Access-Control-Expose-Headers: Location
#
# Craig Fitzgerald

use warnings;
use strict;
use JSON;
use Gnu::TinyDB;
use Gnu::CGIUtil qw(Route ReturnText ReturnJSON GetPostBody);

my @routes = (
   {method => "GET"   , resource => "item", fn => \&GetItems  },
   {method => "POST"  , resource => "item", fn => \&PostItem  },
   {method => "PUT"   , resource => "item", fn => \&PutItem   },
   {method => "DELETE", resource => "item", fn => \&DeleteItem},
   {method => "GET"   , resource => "menu", fn => \&GetMenus  },
   {method => "POST"  , resource => "menu", fn => \&PostMenu  },
   {method => "DELETE", resource => "menu", fn => \&DeleteMenu},
);

#my $DATA_DIR = "c:/apache/cgi-bin/romanticdinner";
#my $REF_FILE = "RefData.txt";

MAIN:
   Connection("menu");
   Route(@routes);
   exit(0);


sub GetItems {
   my ($id, $params, $resource) = @_;

   ReturnJSON({items=>FetchArray("select * from item where archived=0 order by description")});
}

sub PostItem {
   my ($id, $params, $resource) = @_;

   my $data = decode_json(GetPostBody());
   my $sql  = "insert into item (type, description) values (?,?)";
   my $ok   = ExecSQL($sql, @{$data}{qw(type description)});

   ReturnJSON({ok=>$ok, id=>GetInsertId()}, 201);
}

sub PutItem {
   my ($id, $params, $resource) = @_;

   my $data = decode_json(GetPostBody());
   my $sql  = "update item set description=? where id=?";
   my $ok   = ExecSQL($sql, @{$data}{qw(description id)});

   ReturnJSON({ok=>$ok}, 201);
}

sub DeleteItem {
   my ($id, $params, $resource) = @_;

   my $sql = "update item set archived=1 where id = ?";
   my $ok  = ExecSQL($sql, $id);

   ReturnJSON({ok=>$ok}, 204);
}

sub GetMenus {
   my ($id, $params, $resource) = @_;

   my $sql = "select *, ".
             "  DATE_FORMAT(created, '%m/%d/%Y ') as date , ".
             "  TIME_FORMAT(created, '%l:%i %p' ) as time ".
             "from menu ".
             "where archived=0 ".
             "order by created desc";

   ReturnJSON({menus=>FetchArray($sql)});
}

sub PostMenu {
   my ($id, $params, $resource) = @_;

   my $json  = GetPostBody();
   my $data  = decode_json($json);
   my $label = "$data->{guest1} & $data->{guest2}";
   my $sql   = "insert into menu (label, data) values (?,?)";
   my $ok    = ExecSQL($sql, $label, $json);

   ReturnJSON({ok=>$ok, id=>GetInsertId()}, 201);
}

sub DeleteMenu {
   my ($id, $params, $resource) = @_;

   my $sql = "update menu set archived=1 where id = ?";
   my $ok  = ExecSQL($sql, $id);

   ReturnJSON({ok=>$ok}, 204);
}

#sub Migrate {
#   my ($id, $params, $resource) = @_;
#
#   my @items = OldGetItems();
#   print "Got " . (scalar @items) . " items.\n";
#
#   foreach my $item (@items) {
#      PostItem(0, $item);
#   }
#}
#
#sub OldGetItems {
#   my ($id, $params, $resource) = @_;
#
#   my $filespec = "$DATA_DIR/$REF_FILE";
#   open (my $fh, "<$filespec") or die "cannot open '$filespec'";
#
#   my @items = ();
#   while (my $line = <$fh>)
#      {
#      chomp $line;
#
#      next unless $line;
#      my ($kind, $type, $descr) = split("#", $line);
#      next unless $descr;
#
#      push(@items, {kind=>$kind, type=>$type, description=>$descr});
#      };
#   close($fh);
#   ReturnJSON({items=>[@items]});
#   return @items;
#}
