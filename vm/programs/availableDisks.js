export const availableDisks = {
	disk0: "load 5	  ; this is a comment!\n" +
          "add 255 write 255\n" +
          "\n" +
          "load 238\n" +
          "write 239\n" +
          "\n" +
          "read 239\n" +
          "write 238\n" +
          "read 254\n" +
          "write 239\n" +
          "\n" +
          "read 238\n" +
          "write 237\n" +
          "read 254\n" +
          "write 238\n" +
          "\n" +
          "read 254\n" +
          "write 237\n" +
          "\n" +
          "read 255 cmp 0 jnz 2\n"+
          "\nhalt\n",
	disk1: "load 16\nadd 255\npush\ncmp 0\njnz 2\n\nhalt\n",
	disk2: "load 1 \ncmp 0\npush push\nwrite 30 \nload 2\nwrite 31\npush\n\naddi 30 \nwrite 30 \npush \naddi 31 \nwrite 31 \npush \njnz 16",
	disk3: "jmp 2 halt ; this is a work in progress ... \n"
	    + "load 2 push ; first invocation returns to 2 and halts\n load 0 push ; argument n: produce this fibonacci number\n"
	    + "pop ; get argument (n)\n"
	    + "cmp 0 jnz ISNOTZERO"
	    + "pop write 0x40 ; get return address\n"
	    + "load 1 push ; F0 = 1\n"
	    + "jmpi 0x40 ; return\n"
	    + "cmp 1 jnz ISNOTONE ; (ISNOTZERO)\n"
	    + "pop write 0x40 ; get return address\n"
	    + "load 1 push ; (BASE) F1 = 1\n"
	    + "jmpi 0x40 ; return"
	    + "push ; save argument\n"
	    + "load RET1 push ; push return address\n"
	    + "add 0xFF push ; (ISNOTONE) pass n-1 to first invocation\n"
	    + "jmp FIB ; invoke and leave return value on the stack\n"
	    + "pop write 0x42 ; retrieve return value\n"
	    + "pop write 0x43 ; retrieve argument\n"
	    + "read 0x42 push ; save previous return value\n"
	    + "load RET1 push ; push return address\n"
	    + "read 0x43 add 0xFE push ; (RET1) pass n-2 to second invocation\n"
	    + "jmp FIB ; invoke and leave return value on the stack\n"
	    + "pop write 0x44 ; retrieve Fn-2 (RET2)\n"
	    + "pop addi 0x44 write 0x45 ; retrieve Fn-1 and add it to Fn-2\n"
	    + "pop write 0x40 ; get return address\n"
	    + "read 0x45 push ; push return value\n"
	    + "jmpi 0x40"
	    + ""
};
