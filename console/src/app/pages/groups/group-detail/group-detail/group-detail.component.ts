import { MediaMatcher } from '@angular/cdk/layout';
import { Location } from '@angular/common';
import { PageEvent } from '@angular/material/paginator';
import { Component, EventEmitter, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { ActivatedRoute, Params, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { take } from 'rxjs/operators';
import { ChangeType } from 'src/app/modules/changes/changes.component';
import { InfoSectionType } from 'src/app/modules/info-section/info-section.component';
import { WarnDialogComponent } from 'src/app/modules/warn-dialog/warn-dialog.component';
import { Metadata } from 'src/app/proto/generated/zitadel/metadata_pb';
import { LoginPolicy } from 'src/app/proto/generated/zitadel/policy_pb';
import { Group, GroupState } from 'src/app/proto/generated/zitadel/group_pb';
import { User } from 'src/app/proto/generated/zitadel/user_pb';
import { Breadcrumb, BreadcrumbService, BreadcrumbType } from 'src/app/services/breadcrumb.service';
import { ManagementService } from 'src/app/services/mgmt.service';
import { ToastService } from 'src/app/services/toast.service';
import { LanguagesService } from '../../../../services/languages.service';
import { NameDialogComponent } from 'src/app/modules/name-dialog/name-dialog.component';
import { CreationType, MemberCreateDialogComponent } from 'src/app/modules/add-member-dialog/member-create-dialog.component';
import { Member } from 'src/app/proto/generated/zitadel/member_pb';
import { ActionKeysType } from 'src/app/modules/action-keys/action-keys.component';
import { GroupMembersDataSource } from './group-members-datasource';

@Component({
  selector: 'cnsl-group-detail',
  templateUrl: './group-detail.component.html',
  styleUrls: ['./group-detail.component.scss'],
})
export class GroupDetailComponent implements OnInit {
  public INITIALPAGESIZE: number = 25;
  public group!: Group.AsObject;
  public metadata: Metadata.AsObject[] = [];
  public groupId: string = '';

  public ChangeType: any = ChangeType;

  public loading: boolean = true;
  public loadingMetadata: boolean = true;
  public changePageFactory!: Function;
  public dataSource!: GroupMembersDataSource;
  public groupName: string = '';

  public GroupState: any = GroupState;
  public copied: string = '';
  public selection: Array<Member.AsObject> = [];

  public changePage: EventEmitter<void> = new EventEmitter();
  public InfoSectionType: any = InfoSectionType;

  public error: string = '';

  public currentSetting: string | undefined = 'general';
  public loginPolicy?: LoginPolicy.AsObject;
  public ActionKeysType: any = ActionKeysType;

  constructor(
    public translate: TranslateService,
    private route: ActivatedRoute,
    private toast: ToastService,
    public mgmtGroupService: ManagementService,
    private _location: Location,
    private dialog: MatDialog,
    private router: Router,
    activatedRoute: ActivatedRoute,
    private mediaMatcher: MediaMatcher,
    public langSvc: LanguagesService,
    breadcrumbService: BreadcrumbService,
  ) {
    activatedRoute.queryParams.pipe(take(1)).subscribe((params: Params) => {
      const { id } = params;
      if (id) {
        this.currentSetting = id;
      }
    });

    breadcrumbService.setBreadcrumb([
      new Breadcrumb({
        type: BreadcrumbType.ORG,
        routerLink: ['/org'],
      }),
    ]);

    const mediaq: string = '(max-width: 500px)';
    const small = this.mediaMatcher.matchMedia(mediaq).matches;
    if (small) {
      this.changeSelection(small);
    }
    this.mediaMatcher.matchMedia(mediaq).onchange = (small) => {
      this.changeSelection(small.matches);
    };
    this.loadMembers();
  }

  private changeSelection(small: boolean): void {
    if (small) {
      this.currentSetting = undefined;
    } else {
      this.currentSetting = this.currentSetting === undefined ? 'general' : this.currentSetting;
    }
  }

  public loadMembers(): Promise<any> {
    return this.mgmtGroupService.getGroupByID(this.groupId).then((resp) => {
      if (resp.group) {
        this.group = resp.group;
        this.groupName = this.group.name;
        this.dataSource = new GroupMembersDataSource(this.mgmtGroupService);
        this.dataSource.loadMembers(this.group.id, 0, this.INITIALPAGESIZE);

        this.changePageFactory = (event?: PageEvent) => {
          return this.dataSource.loadMembers(
            (this.group as Group.AsObject).id,
            event?.pageIndex ?? 0,
            event?.pageSize ?? this.INITIALPAGESIZE
          );
        };
      }
    });
  }

  refreshGroup(): void {
    this.changePage.emit();
    this.route.params.pipe(take(1)).subscribe((params) => {
      this.loading = true;
      const { id } = params;
      this.mgmtGroupService
        .getGroupByID(id)
        .then((resp) => {
          this.loading = false;
          if (resp.group) {
            this.group = resp.group;
          }
        })
        .catch((err) => {
          this.error = err.message ?? '';
          this.loading = false;
          this.toast.showError(err);
        });
    });
  }

  public ngOnInit(): void {
    const groupId = this.route.snapshot.paramMap.get('id');
    this.refreshGroup();

    this.mgmtGroupService.getLoginPolicy().then((policy) => {
      if (policy.policy) {
        this.loginPolicy = policy.policy;
      }
    });
  }

  public changeState(newState: GroupState): void {
    if (newState === GroupState.GROUP_STATE_ACTIVE) {
      this.mgmtGroupService
        .reactivateGroup(this.group.id)
        .then(() => {
          this.toast.showInfo('GROUP.TOAST.REACTIVATED', true);
          this.group.state = newState;
        })
        .catch((error) => {
          this.toast.showError(error);
        });
    } else if (newState === GroupState.GROUP_STATE_INACTIVE) {
      this.mgmtGroupService
        .deactivateGroup(this.group.id)
        .then(() => {
          this.toast.showInfo('GROUP.TOAST.DEACTIVATED', true);
          this.group.state = newState;
        })
        .catch((error) => {
          this.toast.showError(error);
        });
    }
  }

  public navigateBack(): void {
    this._location.back();
  }

  public deleteGroup(): void {
    const dialogRef = this.dialog.open(WarnDialogComponent, {
      data: {
        confirmKey: 'ACTIONS.DELETE',
        cancelKey: 'ACTIONS.CANCEL',
        titleKey: 'GROUP.DIALOG.DELETE_TITLE',
        descriptionKey: 'GROUP.DIALOG.DELETE_DESCRIPTION',
      },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((resp) => {
      if (resp) {
        this.mgmtGroupService
          .removeGroup(this.group.id)
          .then(() => {
            const params: Params = {
              deferredReload: true,
            };
            this.router.navigate(['/groups'], { queryParams: params });
            this.toast.showInfo('GROUP.TOAST.DELETED', true);
          })
          .catch((error) => {
            this.toast.showError(error);
          });
      }
    });
  }

  public openNameDialog(): void {
    const dialogRef = this.dialog.open(NameDialogComponent, {
      data: {
        name: this.group?.name,
        titleKey: 'APP.NAMEDIALOG.TITLE',
        descKey: 'APP.NAMEDIALOG.DESCRIPTION',
        labelKey: 'APP.NAMEDIALOG.NAME',
      },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((name) => {
      if (name) {
        this.group!.name = name;
        this.saveGroup();
      }
    });
  }

  public saveGroup(): void {
    if (this.group) {
      this.mgmtGroupService
        .updateGroup(this.group.id, this.group.name)
        .then(() => {
          this.toast.showInfo('APP.TOAST.UPDATED', true);
        })
        .catch((error) => {
          this.toast.showError(error);
        });
    }
  }

  public openAddMember(): void {
    const dialogRef = this.dialog.open(MemberCreateDialogComponent, {
      data: {
        creationType: CreationType.PROJECT_OWNED,
      },
      width: '400px',
    });

    dialogRef.afterClosed().subscribe((resp) => {
      if (resp) {
        const users: User.AsObject[] = resp.users;

        if (users && users.length) {
          Promise.all(
            users.map((user) => {
              return this.mgmtGroupService.addGroupMember((this.group as Group.AsObject).id, user.id);
            }),
          )
            .then(() => {
              setTimeout(() => {
                this.changePage.emit();
              }, 1000);
              this.toast.showInfo('PROJECT.TOAST.MEMBERSADDED', true);
            })
            .catch((error) => {
              this.changePage.emit();
              this.toast.showError(error);
            });
        }
      }
    });
  }

  public removeGroupMemberSelection(): void {
    Promise.all(
      this.selection.map((member) => {
          return this.mgmtGroupService.removeGroupMember((this.group as Group.AsObject).id, member.userId).then(() => {
            this.toast.showInfo('PROJECT.TOAST.MEMBERREMOVED', true);
          });
      }),
    )
      .then(() => {
        setTimeout(() => {
          this.changePage.emit();
        }, 1000);
      })
      .catch((error) => {
        this.toast.showError(error);
        this.changePage.emit();
      });
  }

  public removeGroupMember(member: Member.AsObject | Member.AsObject): void {
    this.mgmtGroupService
      .removeGroupMember((this.group as Group.AsObject).id, member.userId)
      .then(() => {
        setTimeout(() => {
          this.changePage.emit();
        }, 1000);
        this.toast.showInfo('PROJECT.TOAST.MEMBERREMOVED', true);
      })
      .catch((error) => {
        this.toast.showError(error);
        this.changePage.emit();
      });
  }
}
